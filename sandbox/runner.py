"""CipherCats code sandbox.

A tiny HTTP service that runs untrusted Python snippets for labs. It is meant
to run in its OWN container (Docker or a Replit deployment), never inside the
main API. Only the Flask backend calls it, authenticated with SANDBOX_TOKEN.

Defence layers:
  * container: non-root user, read-only FS, no network, memory/CPU caps (see Dockerfile / README)
  * process:   fresh `python -I -S` subprocess per run, empty env, temp cwd,
               wall-clock timeout, rlimits on CPU/memory/files/processes (Linux)
  * output:    stdout/stderr truncated
"""

from __future__ import annotations

import hmac
import os
import subprocess
import sys
import tempfile

from flask import Flask, abort, jsonify, request

TOKEN = os.environ.get("SANDBOX_TOKEN", "")
TIMEOUT_S = float(os.environ.get("SANDBOX_TIMEOUT", "5"))
MAX_CODE = 10_000
MAX_OUTPUT = 20_000
MEMORY_BYTES = 128 * 1024 * 1024

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024


def _limit_resources():  # runs in the child before exec (POSIX only)
    import resource

    resource.setrlimit(resource.RLIMIT_CPU, (int(TIMEOUT_S), int(TIMEOUT_S)))
    resource.setrlimit(resource.RLIMIT_AS, (MEMORY_BYTES, MEMORY_BYTES))
    resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024, 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_NPROC, (0, 0))
    resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))
    os.setsid()


def run_code(code: str) -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        try:
            proc = subprocess.run(
                [sys.executable, "-I", "-S", "-B", "-c", code],
                cwd=tmp,
                env={"PYTHONIOENCODING": "utf-8"},
                capture_output=True,
                stdin=subprocess.DEVNULL,
                timeout=TIMEOUT_S,
                preexec_fn=_limit_resources if os.name == "posix" else None,
            )
        except subprocess.TimeoutExpired as e:
            return {
                "stdout": (e.stdout or b"").decode("utf-8", "replace")[:MAX_OUTPUT],
                "stderr": f"Timed out after {TIMEOUT_S:g}s",
                "exit_code": None,
                "timed_out": True,
            }
    return {
        "stdout": proc.stdout.decode("utf-8", "replace")[:MAX_OUTPUT],
        "stderr": proc.stderr.decode("utf-8", "replace")[:MAX_OUTPUT],
        "exit_code": proc.returncode,
        "timed_out": False,
    }


@app.get("/health")
def health():
    return jsonify(ok=True)


@app.post("/run")
def run():
    if not TOKEN or not hmac.compare_digest(request.headers.get("X-Sandbox-Token", ""), TOKEN):
        abort(401)
    body = request.get_json(silent=True) or {}
    code = body.get("code")
    if not isinstance(code, str) or not code or len(code) > MAX_CODE:
        abort(400)
    return jsonify(run_code(code))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")))
