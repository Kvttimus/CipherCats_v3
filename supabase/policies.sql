-- CipherCats RLS policies
-- Run this AFTER schema.sql.
--
-- Architecture rule: the frontend NEVER talks to the database. It only uses
-- Supabase Auth; all reads/writes go through the Flask backend with the
-- service_role key. RLS is therefore locked down to "own rows, read-only" as
-- defence in depth in case the anon key is ever used against PostgREST directly.

-- profiles: each user can see their own row only (writes go through Flask)
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Removed: clients used to update their own profile (incl. xp!) directly.
drop policy if exists "profiles_update_own" on public.profiles;

-- storylines: publicly readable catalog (no client writes)
alter table public.storylines enable row level security;

drop policy if exists "storylines_select_all" on public.storylines;
create policy "storylines_select_all"
  on public.storylines for select
  using (true);

-- labs: publicly readable metadata (no client writes; solution lives elsewhere)
alter table public.labs enable row level security;

drop policy if exists "labs_select_all" on public.labs;
create policy "labs_select_all"
  on public.labs for select
  using (true);

-- lab_solutions: NO policies = NO client access. Server reads via service_role key.
alter table public.lab_solutions enable row level security;

-- lab_attempts: each user can read their own attempts (inserts go through Flask)
alter table public.lab_attempts enable row level security;

drop policy if exists "lab_attempts_select_own" on public.lab_attempts;
create policy "lab_attempts_select_own"
  on public.lab_attempts for select
  using (auth.uid() = user_id);

drop policy if exists "lab_attempts_insert_own" on public.lab_attempts;

-- lab_progress: each user reads own; server writes via service_role
alter table public.lab_progress enable row level security;

drop policy if exists "lab_progress_select_own" on public.lab_progress;
create policy "lab_progress_select_own"
  on public.lab_progress for select
  using (auth.uid() = user_id);

-- lab_completions: each user reads own; server writes via service_role
alter table public.lab_completions enable row level security;

drop policy if exists "lab_completions_select_own" on public.lab_completions;
create policy "lab_completions_select_own"
  on public.lab_completions for select
  using (auth.uid() = user_id);

-- user_badges: each user reads own; server writes via service_role
alter table public.user_badges enable row level security;

drop policy if exists "user_badges_select_own" on public.user_badges;
create policy "user_badges_select_own"
  on public.user_badges for select
  using (auth.uid() = user_id);
