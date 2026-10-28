"""Storyline + lab content, kept as code so ciphertexts are generated (and
tested) rather than hand-typed. ``scripts/gen_seed.py`` turns this into
``supabase/seed.sql``."""

from .codebreaker import CODEBREAKER_QUEST
from .puzzles import PUZZLES_OF_THE_PAST
from .storylines import UPCOMING_STORYLINES

STORYLINES = [CODEBREAKER_QUEST, PUZZLES_OF_THE_PAST, *UPCOMING_STORYLINES]
