"""Badge catalog + award rules. Earned badges are stored in ``user_badges``."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Badge:
    id: str
    name: str
    description: str
    icon: str  # lucide icon name, rendered by the frontend


BADGES: list[Badge] = [
    Badge("beginner", "Beginner", "Complete your first lab.", "sparkles"),
    Badge("shift-master", "Shift Master", "Crack the Caesar cipher in The Forgotten Shift.", "rotate-cw"),
    Badge("polyalphabetic", "Polyalphabetic", "Break the Vigenère cipher in Twin V's Secret.", "layers"),
    Badge("modular-mind", "Modular Mind", "Invert an affine cipher in Modular Minds.", "sigma"),
    Badge("frequency-hunter", "Frequency Hunter", "Beat The Frequency Trap.", "bar-chart-3"),
    Badge("codebreaker", "Codebreaker", "Finish the Codebreaker Quest boss lab.", "crown"),
    Badge("historian", "Historian", "Restore the timeline in Puzzles of the Past.", "scroll-text"),
    Badge("first-try", "Sharpshooter", "Solve a lab on your first attempt.", "target"),
    Badge("no-hints", "Lone Wolf", "Solve a lab without opening any hints.", "eye-off"),
    Badge("speed-demon", "Time Pro", "Solve a lab in under 2 minutes.", "timer"),
    Badge("persistent", "Persistent", "Solve a lab after 5 or more wrong answers.", "repeat"),
    Badge("wealthy", "Wealthy", "Earn 500 XP.", "gem"),
]
BADGES_BY_ID = {b.id: b for b in BADGES}

LAB_BADGES = {
    "forgotten-shift": "shift-master",
    "twin-vs-secret": "polyalphabetic",
    "modular-minds": "modular-mind",
    "frequency-trap": "frequency-hunter",
    "great-decryption": "codebreaker",
    "digital-age-decryption": "historian",
}


def badges_for_completion(
    *,
    lab_slug: str,
    attempts: int,
    hints_used: int,
    revealed: bool,
    time_ms: int | None,
    total_completed: int,
    total_xp: int,
) -> set[str]:
    """Badges this completion qualifies for. The caller subtracts ones already owned.
    Revealing the solution forfeits the skill-based badges, but the lab badge is kept."""
    earned: set[str] = set()
    if total_completed >= 1:
        earned.add("beginner")
    if lab_slug in LAB_BADGES:
        earned.add(LAB_BADGES[lab_slug])
    if total_xp >= 500:
        earned.add("wealthy")
    if revealed:
        return earned
    if attempts == 1:
        earned.add("first-try")
    if hints_used == 0:
        earned.add("no-hints")
    if time_ms is not None and time_ms < 120_000:
        earned.add("speed-demon")
    if attempts >= 6:
        earned.add("persistent")
    return earned
