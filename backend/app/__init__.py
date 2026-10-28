"""CipherCats Flask API."""

from __future__ import annotations

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from .config import Config
from .limiter import limiter


def create_app(config: Config | None = None, db=None) -> Flask:
    config = config or Config.from_env()
    app = Flask(__name__)
    app.config["CC"] = config
    app.config["RATELIMIT_ENABLED"] = config.rate_limit_enabled
    app.config["MAX_CONTENT_LENGTH"] = 64 * 1024

    # Tests inject a fake database; production builds the Supabase client lazily.
    if db is not None:
        app.extensions["cc_db"] = db

    CORS(
        app,
        resources={r"/api/*": {"origins": config.cors_origins}},
        allow_headers=["Authorization", "Content-Type"],
        methods=["GET", "POST", "PATCH", "OPTIONS"],
        max_age=600,
    )
    limiter.init_app(app)

    from .routes import bp

    app.register_blueprint(bp, url_prefix="/api")

    @app.after_request
    def security_headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "no-referrer")
        resp.headers.setdefault("Cache-Control", "no-store")
        return resp

    @app.errorhandler(HTTPException)
    def http_error(e: HTTPException):
        return jsonify(error=e.description or e.name), e.code

    @app.errorhandler(429)
    def rate_limited(e):
        return jsonify(error="Slow down, agent. Too many requests, try again in a moment."), 429

    return app
