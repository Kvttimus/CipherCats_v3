-- CipherCats schema
-- Run this first in the Supabase SQL Editor. It is idempotent: re-running it on
-- an existing database upgrades it in place (new columns/tables/functions).

create extension if not exists "pgcrypto";

-- Difficulty levels for storylines (matches proposal's "Easy/Medium/Hard/Extreme")
do $$ begin
  create type public.difficulty as enum ('easy', 'medium', 'hard', 'extreme');
exception when duplicate_object then null; end $$;

-- User profile extends auth.users (1:1 via shared id)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_id int not null default 0,
  xp int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists avatar_chosen boolean not null default false;

-- Storyline = a themed series of labs (e.g. "Codebreaker Quest")
create table if not exists public.storylines (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  theme text,
  description text,
  difficulty public.difficulty not null default 'easy',
  order_index int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.storylines add column if not exists vibe text;
alter table public.storylines add column if not exists reward text;
alter table public.storylines add column if not exists available boolean not null default true;
-- Planned lab titles for storylines that aren't playable yet
alter table public.storylines add column if not exists preview jsonb not null default '[]'::jsonb;

-- Lab = a single challenge within a storyline. Public metadata only (no solution).
create table if not exists public.labs (
  id uuid primary key default gen_random_uuid(),
  storyline_id uuid not null references public.storylines(id) on delete cascade,
  slug text unique not null,
  title text not null,
  description text,
  story_segment text,
  challenge_prompt text,
  cipher_type text not null,
  payload jsonb not null default '{}'::jsonb,
  order_index int not null default 0,
  xp_reward int not null default 100,
  created_at timestamptz not null default now()
);
alter table public.labs add column if not exists skills text[] not null default '{}';
alter table public.labs add column if not exists is_boss boolean not null default false;

-- Solutions + hints held in a separate table so RLS can fully block client reads.
-- Only the Flask backend (service_role) reads this table.
create table if not exists public.lab_solutions (
  lab_id uuid primary key references public.labs(id) on delete cascade,
  solution text not null
);
alter table public.lab_solutions add column if not exists hints jsonb not null default '[]'::jsonb;

-- Every submission attempt (for analytics + difficulty balancing)
create table if not exists public.lab_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lab_id uuid not null references public.labs(id) on delete cascade,
  submitted_answer text not null,
  correct boolean not null,
  time_taken_ms int,
  created_at timestamptz not null default now()
);

create index if not exists lab_attempts_user_lab_idx on public.lab_attempts(user_id, lab_id);

-- Per-user, per-lab state while a lab is in progress (hints opened, solution revealed)
create table if not exists public.lab_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lab_id uuid not null references public.labs(id) on delete cascade,
  hints_used int not null default 0,
  revealed boolean not null default false,
  started_at timestamptz not null default now(),
  primary key (user_id, lab_id)
);

-- First-completion record per user/lab (awards XP exactly once)
create table if not exists public.lab_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lab_id uuid not null references public.labs(id) on delete cascade,
  first_completed_at timestamptz not null default now(),
  attempts_count int not null default 1,
  primary key (user_id, lab_id)
);
alter table public.lab_completions add column if not exists time_taken_ms int;
alter table public.lab_completions add column if not exists hints_used int not null default 0;
alter table public.lab_completions add column if not exists revealed boolean not null default false;
alter table public.lab_completions add column if not exists xp_awarded int not null default 0;

-- Badges earned. Badge definitions live in the backend (backend/app/badges.py).
create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- Auto-create a profile row when a new auth.users row is inserted.
-- Anonymous (guest) users get a guest_xxxxxxxx username.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_username text;
begin
  if coalesce(new.is_anonymous, false) then
    candidate_username := 'guest_' || substring(replace(new.id::text, '-', '') from 1 for 8);
  else
    candidate_username := coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    );
  end if;

  insert into public.profiles (id, username, avatar_id)
  values (new.id, candidate_username, 0)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Record a first completion and award XP atomically, so two concurrent correct
-- submissions can never double-award. Returns true if this call was the first.
create or replace function public.record_lab_completion(
  p_user uuid,
  p_lab uuid,
  p_attempts int,
  p_time_ms int,
  p_hints int,
  p_revealed boolean,
  p_xp int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lab_completions
    (user_id, lab_id, attempts_count, time_taken_ms, hints_used, revealed, xp_awarded)
  values
    (p_user, p_lab, p_attempts, p_time_ms, p_hints, p_revealed, p_xp)
  on conflict (user_id, lab_id) do nothing;

  if not found then
    return false;
  end if;

  update public.profiles set xp = xp + p_xp where id = p_user;
  return true;
end;
$$;

revoke all on function public.record_lab_completion(uuid, uuid, int, int, int, boolean, int) from public, anon, authenticated;
grant execute on function public.record_lab_completion(uuid, uuid, int, int, int, boolean, int) to service_role;

-- Bump the hint counter atomically and return the new value.
create or replace function public.use_lab_hint(p_user uuid, p_lab uuid, p_max int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  insert into public.lab_progress (user_id, lab_id, hints_used)
  values (p_user, p_lab, least(1, p_max))
  on conflict (user_id, lab_id)
    do update set hints_used = least(public.lab_progress.hints_used + 1, p_max)
  returning hints_used into n;
  return n;
end;
$$;

revoke all on function public.use_lab_hint(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.use_lab_hint(uuid, uuid, int) to service_role;
