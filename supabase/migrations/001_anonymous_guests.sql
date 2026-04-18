-- Migration 001: support anonymous (guest) users
-- Run this in the SQL Editor after enabling anonymous sign-ins.
-- It replaces the handle_new_user trigger to generate a guest_xxxxxxxx username
-- when auth.users.is_anonymous is true (no email, no username metadata).

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
