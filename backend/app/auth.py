from __future__ import annotations

from functools import wraps

from flask import abort, g, request

from .db import get_db


def require_user(fn):
    """Require a valid Supabase access token in ``Authorization: Bearer <jwt>``."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        scheme, _, token = header.partition(" ")
        if scheme.lower() != "bearer" or not token or len(token) > 4096:
            abort(401, description="Missing or malformed Authorization header")
        user = get_db().user_from_token(token.strip())
        if user is None:
            abort(401, description="Invalid or expired session. Please log in again.")
        g.user = user
        return fn(*args, **kwargs)

    return wrapper
