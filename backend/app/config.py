from __future__ import annotations

import os
from dataclasses import dataclass, field


def _csv(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Config:
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    cors_origins: list[str] = field(default_factory=lambda: ["http://localhost:5173"])
    sandbox_url: str = ""
    sandbox_token: str = ""
    rate_limit_enabled: bool = True

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            supabase_url=os.environ.get("SUPABASE_URL", ""),
            supabase_service_role_key=os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
            cors_origins=_csv(os.environ.get("CORS_ORIGINS", "http://localhost:5173")),
            sandbox_url=os.environ.get("SANDBOX_URL", "").rstrip("/"),
            sandbox_token=os.environ.get("SANDBOX_TOKEN", ""),
            rate_limit_enabled=os.environ.get("RATE_LIMIT_ENABLED", "true").lower() != "false",
        )
