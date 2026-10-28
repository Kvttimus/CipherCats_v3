"""Game rules: levels, lab unlocking, XP rewards and skill ranks."""

from __future__ import annotations

XP_PER_LEVEL = 250
HINT_PENALTY = 0.15  # each hint costs 15% of the lab's XP...
MIN_XP_FRACTION = 0.5  # ...down to half the reward

# Within a storyline, True: each lab unlocks only after the previous one is
# completed; False: every lab is open from the start. (Storylines themselves
# never lock each other. Any available storyline can be started at any time.)
SEQUENTIAL_UNLOCK = True

SKILL_RANKS =[(3, "Expert"), (2, "Intermediate"), (1, "Beginner")]


def level_info(xp: int) -> dict:
    level = xp // XP_PER_LEVEL + 1
    into = xp % XP_PER_LEVEL
    return {"level": level, "xp": xp, "xp_into_level": into, "xp_for_next": XP_PER_LEVEL}


def xp_for_completion(reward: int, hints_used: int, revealed: bool) -> int:
    if revealed:
        return 0
    fraction = max(MIN_XP_FRACTION, 1 - HINT_PENALTY * hints_used)
    return int(round(reward * fraction))


def lab_statuses(labs: list[dict], completed_ids: set[str], sequential: bool | None = None) -> dict[str, str]:
    """Map lab id -> 'completed' | 'unlocked' | 'locked' for ONE storyline's labs.
    With ``sequential`` (default: SEQUENTIAL_UNLOCK), a lab unlocks once every
    earlier lab is completed; otherwise every lab is open, in any order."""
    if sequential is None:
        sequential = SEQUENTIAL_UNLOCK
    out: dict[str, str] = {}
    blocked = False
    for lab in sorted(labs, key=lambda l: l["order_index"]):
        if lab["id"] in completed_ids:
            out[lab["id"]] = "completed"
        elif blocked:
            out[lab["id"]] = "locked"
        else:
            out[lab["id"]] = "unlocked"
            blocked = sequential
    return out


def skill_ranks(labs: list[dict], completed_ids: set[str]) -> list[dict]:
    totals: dict[str, int] = {}
    done: dict[str, int] = {}
    for lab in labs:
        for skill in lab.get("skills") or []:
            totals[skill] = totals.get(skill, 0) + 1
            if lab["id"] in completed_ids:
                done[skill] = done.get(skill, 0) + 1
    out = []
    for skill in sorted(totals):
        n = done.get(skill, 0)
        rank = next((name for threshold, name in SKILL_RANKS if n >= threshold), "Locked")
        out.append({"skill": skill, "rank": rank, "completed": n, "total": totals[skill]})
    return out
