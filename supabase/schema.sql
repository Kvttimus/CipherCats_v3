-- CipherCats schema
-- Run this first in the Supabase SQL Editor.

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

-- Lab solutions held in a separate table so RLS can fully block client reads.
-- Only the server (service_role) reads this table.
create table if not exists public.lab_solutions (
  lab_id uuid primary key references public.labs(id) on delete cascade,
  solution text not null
);

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

-- First-completion record per user/lab (awards XP exactly once)
create table if not exists public.lab_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lab_id uuid not null references public.labs(id) on delete cascade,
  first_completed_at timestamptz not null default now(),
  attempts_count int not null default 1,
  primary key (user_id, lab_id)
);

-- Auto-create a profile row when a new auth.users row is inserted
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_username text;
begin
  candidate_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
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
