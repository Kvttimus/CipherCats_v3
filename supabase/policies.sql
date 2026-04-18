-- CipherCats RLS policies
-- Run this AFTER schema.sql.

-- profiles: each user can see & update their own row only
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

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

-- lab_attempts: each user can insert and read their own attempts
alter table public.lab_attempts enable row level security;

drop policy if exists "lab_attempts_select_own" on public.lab_attempts;
create policy "lab_attempts_select_own"
  on public.lab_attempts for select
  using (auth.uid() = user_id);

drop policy if exists "lab_attempts_insert_own" on public.lab_attempts;
create policy "lab_attempts_insert_own"
  on public.lab_attempts for insert
  with check (auth.uid() = user_id);

-- lab_completions: each user reads own; server writes via service_role
alter table public.lab_completions enable row level security;

drop policy if exists "lab_completions_select_own" on public.lab_completions;
create policy "lab_completions_select_own"
  on public.lab_completions for select
  using (auth.uid() = user_id);
