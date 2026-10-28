import os

from flask import g
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


def _key() -> str:
    # Authenticated routes rate-limit per user; everything else per IP.
    user = getattr(g, "user", None)
    return f"user:{user.id}" if user else f"ip:{get_remote_address()}"


limiter = Limiter(
    key_func=_key,
    default_limits=["300 per minute"],
    storage_uri=os.environ.get("RATE_LIMIT_STORAGE_URI", "memory://"),
)
