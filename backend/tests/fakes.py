"""In-memory stand-in for SupabaseRepo, seeded from backend/content."""

from __future__ import annotations

import itertools
from datetime import datetime, timezone

from app.db import AuthUser
from content import STORYLINES


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class FakeRepo:
    def __init__(self):
        self.tokens: dict[str, AuthUser] = {}
        self.profiles: dict[str, dict] = {}
        self.storylines: list[dict] = []
        self.labs: list[dict] = []
        self.solutions: dict[str, dict] = {}
        self.progress: dict[tuple, dict] = {}
        self.attempts: list[dict] = []
        self.completions: dict[tuple, dict] = {}
        self.badges: dict[tuple, dict] = {}
        ids = itertools.count(1)
        for s in STORYLINES:
            sid = f"s{next(ids)}"
            self.storylines.append(
                {
                    "id": sid,
                    **{k: s.get(k) for k in ("slug", "title", "theme", "vibe", "description", "difficulty", "reward", "order_index")},
                    "available": s.get("available", False),
                    "preview": s.get("preview", []),
                }
            )
            for i, lab in enumerate(s.get("labs", []), start=1):
                lid = f"l{next(ids)}"
                self.labs.append(
                    {
                        "id": lid,
                        "storyline_id": sid,
                        "order_index": i,
                        "is_boss": lab.get("is_boss", False),
                        **{k: lab[k] for k in ("slug", "title", "description", "story_segment", "challenge_prompt", "cipher_type", "payload", "skills", "xp_reward")},
                    }
                )
                self.solutions[lid] = {"solution": lab["solution"], "hints": lab["hints"]}

    def add_user(self, token: str, user_id: str, anonymous: bool = False) -> None:
        self.tokens[token] = AuthUser(id=user_id, email=None if anonymous else f"{user_id}@x.io", is_anonymous=anonymous)
        self.profiles[user_id] = {"id": user_id, "username": user_id, "avatar_id": 0, "avatar_chosen": False, "xp": 0}

    def user_from_token(self, token):
        return self.tokens.get(token)

    def get_profile(self, user_id):
        return self.profiles.get(user_id)

    def create_profile(self, user_id, username):
        self.profiles.setdefault(user_id, {"id": user_id, "username": username, "avatar_id": 0, "avatar_chosen": False, "xp": 0})

    def update_profile(self, user_id, fields):
        name = fields.get("username")
        if name and any(p["username"] == name for uid, p in self.profiles.items() if uid != user_id):
            raise RuntimeError("duplicate key value violates unique constraint (23505)")
        self.profiles[user_id].update(fields)

    def list_storylines(self):
        return sorted(self.storylines, key=lambda s: s["order_index"])

    def get_storyline(self, slug):
        return next((s for s in self.storylines if s["slug"] == slug), None)

    def list_labs(self):
        return sorted(self.labs, key=lambda l: l["order_index"])

    def get_lab(self, slug):
        return next((l for l in self.labs if l["slug"] == slug), None)

    def get_solution(self, lab_id):
        return self.solutions.get(lab_id)

    def get_progress(self, user_id, lab_id):
        return self.progress.get((user_id, lab_id))

    def use_hint(self, user_id, lab_id, max_hints):
        p = self.progress.setdefault((user_id, lab_id), {"hints_used": 0, "revealed": False, "started_at": _now()})
        p["hints_used"] = min(p["hints_used"] + 1, max_hints)
        return p["hints_used"]

    def set_revealed(self, user_id, lab_id):
        p = self.progress.setdefault((user_id, lab_id), {"hints_used": 0, "revealed": False, "started_at": _now()})
        p["revealed"] = True

    def insert_attempt(self, user_id, lab_id, answer, correct, time_ms):
        self.attempts.insert(0, {"user_id": user_id, "lab_id": lab_id, "correct": correct, "time_taken_ms": time_ms, "created_at": _now()})

    def count_attempts(self, user_id, lab_id):
        return sum(1 for a in self.attempts if a["user_id"] == user_id and a["lab_id"] == lab_id)

    def list_attempts(self, user_id):
        return [a for a in self.attempts if a["user_id"] == user_id]

    def record_completion(self, user_id, lab_id, attempts, time_ms, hints, revealed, xp):
        if (user_id, lab_id) in self.completions:
            return False
        self.completions[(user_id, lab_id)] = {
            "lab_id": lab_id,
            "first_completed_at": _now(),
            "attempts_count": attempts,
            "time_taken_ms": time_ms,
            "hints_used": hints,
            "revealed": revealed,
            "xp_awarded": xp,
        }
        self.profiles[user_id]["xp"] += xp
        return True

    def list_completions(self, user_id):
        return [c for (u, _), c in self.completions.items() if u == user_id]

    def list_badges(self, user_id):
        return [b for (u, _), b in self.badges.items() if u == user_id]

    def add_badges(self, user_id, badge_ids):
        for b in badge_ids:
            self.badges.setdefault((user_id, b), {"badge_id": b, "earned_at": _now()})
