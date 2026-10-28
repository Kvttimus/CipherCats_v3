"""Database access. The Flask backend is the ONLY component that talks to
Supabase Postgres (with the service_role key); the frontend never does.

Everything goes through ``SupabaseRepo`` so tests can swap in an in-memory fake
with the same interface (see tests/fakes.py).
"""

from __future__ import annotations

import hashlib
import threading
import time
from dataclasses import dataclass

from flask import current_app

LAB_PUBLIC_COLUMNS = (
    "id, storyline_id, slug, title, description, story_segment, challenge_prompt, "
    "cipher_type, payload, skills, is_boss, order_index, xp_reward"
)
STORYLINE_COLUMNS = (
    "id, slug, title, theme, vibe, description, difficulty, available, reward, preview, order_index"
)


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: str | None
    is_anonymous: bool


class SupabaseRepo:
    _TOKEN_TTL = 60.0

    def __init__(self, url: str, service_key: str):
        self._url = url
        self._key = service_key
        self._local = threading.local()
        self._token_cache: dict[str, tuple[float, AuthUser]] = {}
        self._lock = threading.Lock()

    @property
    def sb(self):
        # One client per thread: supabase-py's HTTP/2 connection isn't safe to share
        # across threads, and concurrent requests fail with "Server disconnected".
        client = getattr(self._local, "client", None)
        if client is None:
            from supabase import create_client

            client = self._local.client = create_client(self._url, self._key)
        return client

    # --- auth ---------------------------------------------------------------
    def user_from_token(self, token: str) -> AuthUser | None:
        """Validate a Supabase access token with Supabase Auth (works for both
        legacy HS256 and asymmetric signing keys). Cached briefly per token."""
        key = hashlib.sha256(token.encode()).hexdigest()
        now = time.monotonic()
        with self._lock:
            hit = self._token_cache.get(key)
            if hit and hit[0] > now:
                return hit[1]
        try:
            res = self.sb.auth.get_user(token)
        except Exception:
            return None
        u = getattr(res, "user", None)
        if not u:
            return None
        user = AuthUser(id=u.id, email=u.email, is_anonymous=bool(getattr(u, "is_anonymous", False)))
        with self._lock:
            if len(self._token_cache) > 5000:
                self._token_cache.clear()
            self._token_cache[key] = (now + self._TOKEN_TTL, user)
        return user

    # --- helpers --------------------------------------------------------------
    @staticmethod
    def _first(res) -> dict | None:
        rows = res.data or []
        return rows[0] if rows else None

    # --- profiles -------------------------------------------------------------
    def get_profile(self, user_id: str) -> dict | None:
        res = (
            self.sb.table("profiles")
            .select("id, username, avatar_id, avatar_chosen, xp, created_at")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        return self._first(res)

    def create_profile(self, user_id: str, username: str) -> None:
        self.sb.table("profiles").upsert(
            {"id": user_id, "username": username}, on_conflict="id", ignore_duplicates=True
        ).execute()

    def update_profile(self, user_id: str, fields: dict) -> None:
        self.sb.table("profiles").update(fields).eq("id", user_id).execute()

    # --- catalog --------------------------------------------------------------
    def list_storylines(self) -> list[dict]:
        return self.sb.table("storylines").select(STORYLINE_COLUMNS).order("order_index").execute().data or []

    def get_storyline(self, slug: str) -> dict | None:
        return self._first(self.sb.table("storylines").select(STORYLINE_COLUMNS).eq("slug", slug).limit(1).execute())

    def list_labs(self) -> list[dict]:
        return self.sb.table("labs").select(LAB_PUBLIC_COLUMNS).order("order_index").execute().data or []

    def get_lab(self, slug: str) -> dict | None:
        return self._first(self.sb.table("labs").select(LAB_PUBLIC_COLUMNS).eq("slug", slug).limit(1).execute())

    def get_solution(self, lab_id: str) -> dict | None:
        return self._first(
            self.sb.table("lab_solutions").select("solution, hints").eq("lab_id", lab_id).limit(1).execute()
        )

    # --- progress -------------------------------------------------------------
    def get_progress(self, user_id: str, lab_id: str) -> dict | None:
        return self._first(
            self.sb.table("lab_progress")
            .select("hints_used, revealed, started_at")
            .eq("user_id", user_id)
            .eq("lab_id", lab_id)
            .limit(1)
            .execute()
        )

    def use_hint(self, user_id: str, lab_id: str, max_hints: int) -> int:
        res = self.sb.rpc("use_lab_hint", {"p_user": user_id, "p_lab": lab_id, "p_max": max_hints}).execute()
        return int(res.data or 0)

    def set_revealed(self, user_id: str, lab_id: str) -> None:
        self.sb.table("lab_progress").upsert(
            {"user_id": user_id, "lab_id": lab_id, "revealed": True}, on_conflict="user_id,lab_id"
        ).execute()

    def insert_attempt(self, user_id: str, lab_id: str, answer: str, correct: bool, time_ms: int | None) -> None:
        self.sb.table("lab_attempts").insert(
            {
                "user_id": user_id,
                "lab_id": lab_id,
                "submitted_answer": answer,
                "correct": correct,
                "time_taken_ms": time_ms,
            }
        ).execute()

    def count_attempts(self, user_id: str, lab_id: str) -> int:
        res = (
            self.sb.table("lab_attempts")
            .select("id", count="exact", head=True)
            .eq("user_id", user_id)
            .eq("lab_id", lab_id)
            .execute()
        )
        return int(res.count or 0)

    def list_attempts(self, user_id: str) -> list[dict]:
        return (
            self.sb.table("lab_attempts")
            .select("lab_id, correct, time_taken_ms, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1000)
            .execute()
            .data
            or []
        )

    def record_completion(
        self, user_id: str, lab_id: str, attempts: int, time_ms: int | None, hints: int, revealed: bool, xp: int
    ) -> bool:
        res = self.sb.rpc(
            "record_lab_completion",
            {
                "p_user": user_id,
                "p_lab": lab_id,
                "p_attempts": attempts,
                "p_time_ms": time_ms,
                "p_hints": hints,
                "p_revealed": revealed,
                "p_xp": xp,
            },
        ).execute()
        return bool(res.data)

    def list_completions(self, user_id: str) -> list[dict]:
        return (
            self.sb.table("lab_completions")
            .select("lab_id, first_completed_at, attempts_count, time_taken_ms, hints_used, revealed, xp_awarded")
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )

    # --- badges ---------------------------------------------------------------
    def list_badges(self, user_id: str) -> list[dict]:
        return (
            self.sb.table("user_badges")
            .select("badge_id, earned_at")
            .eq("user_id", user_id)
            .order("earned_at", desc=True)
            .execute()
            .data
            or []
        )

    def add_badges(self, user_id: str, badge_ids: list[str]) -> None:
        if not badge_ids:
            return
        self.sb.table("user_badges").upsert(
            [{"user_id": user_id, "badge_id": b} for b in badge_ids],
            on_conflict="user_id,badge_id",
            ignore_duplicates=True,
        ).execute()


def get_db():
    db = current_app.extensions.get("cc_db")
    if db is None:
        cfg = current_app.config["CC"]
        if not cfg.supabase_url or not cfg.supabase_service_role_key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        db = SupabaseRepo(cfg.supabase_url, cfg.supabase_service_role_key)
        current_app.extensions["cc_db"] = db
    return db
