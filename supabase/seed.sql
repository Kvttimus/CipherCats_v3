-- CipherCats seed data
-- Run this AFTER schema.sql and policies.sql.
-- One storyline (Codebreaker Quest) and its first lab (The Forgotten Shift / Caesar).

-- Storyline
insert into public.storylines (slug, title, theme, description, difficulty, order_index)
values (
  'codebreaker-quest',
  'Codebreaker Quest',
  'Classical Cryptography',
  'A spy infiltration through wartime codes, parchment maps, and secret scrolls. Master the classical ciphers that shaped history.',
  'easy',
  1
)
on conflict (slug) do nothing;

-- Lab 1: The Forgotten Shift (Caesar cipher, shift=7)
-- Plaintext:  MEET AT THE LIGHTHOUSE AT MIDNIGHT
-- Ciphertext: TLLA HA AOL SPNOAOVBZL HA TPKUPNOA
with s as (select id from public.storylines where slug = 'codebreaker-quest')
insert into public.labs (storyline_id, slug, title, description, story_segment, challenge_prompt, cipher_type, payload, order_index, xp_reward)
select
  s.id,
  'forgotten-shift',
  'The Forgotten Shift',
  'Decode a basic Caesar cipher using brute-force or shift analysis.',
  'A crumpled parchment lies on your desk — intercepted from an enemy agent at the docks. The ink is smudged, but the alphabet looks... shifted. Your handler taught you about the Caesar cipher: every letter moved a fixed number of steps down the alphabet. Crack it before dawn, or the rendezvous goes dark.',
  'Decrypt the intercepted message. The cipher is a simple Caesar shift (try values 1-25). Submit the plaintext exactly as decoded.',
  'caesar',
  jsonb_build_object(
    'ciphertext', 'TLLA HA AOL SPNOAOVBZL HA TPKUPNOA',
    'hint_shift_range', '1-25',
    'hint', 'Caesar was Roman. Try shifting each letter backward by a fixed amount.'
  ),
  1,
  100
from s
on conflict (slug) do nothing;

-- Solution (normalized uppercase, spaces preserved)
insert into public.lab_solutions (lab_id, solution)
select id, 'MEET AT THE LIGHTHOUSE AT MIDNIGHT' from public.labs where slug = 'forgotten-shift'
on conflict (lab_id) do nothing;
