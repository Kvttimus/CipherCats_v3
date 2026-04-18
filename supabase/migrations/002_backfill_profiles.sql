-- Migration 002: ensure guest-safe trigger AND backfill any missing profiles.
-- Safe to run multiple times (idempotent).

-- 1. Install the guest-aware trigger function (same as migration 001).
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

-- 2. Backfill profiles for any existing auth.users that don't have one yet.
insert into public.profiles (id, username, avatar_id)
select
  u.id,
  case
    when coalesce(u.is_anonymous, false)
      then 'guest_' || substring(replace(u.id::text, '-', '') from 1 for 8)
    else coalesce(
      u.raw_user_meta_data->>'username',
      split_part(u.email, '@', 1),
      'user_' || substring(replace(u.id::text, '-', '') from 1 for 8)
    )
  end,
  0
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
