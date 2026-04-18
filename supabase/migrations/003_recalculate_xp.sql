-- Migration 003: recalculate profiles.xp from lab_completions.
-- Fixes drift from early runs where completions were recorded but XP updates
-- missed their target row. Safe to re-run.

update public.profiles p
set xp = coalesce((
  select sum(l.xp_reward)
  from public.lab_completions c
  join public.labs l on l.id = c.lab_id
  where c.user_id = p.id
), 0);
