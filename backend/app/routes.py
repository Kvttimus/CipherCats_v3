"""REST API consumed by the React frontend. All routes live under /api."""

from __future__ import annotations

import re

from flask import Blueprint, abort, current_app, g, jsonify, request

from . import progress
from .auth import require_user
from .badges import BADGES, BADGES_BY_ID, badges_for_completion
from .crypto import answer_matches
from .db import get_db
from .limiter import limiter

bp = Blueprint("api", __name__)

MAX_ANSWER_LEN = 500
MAX_CODE_LEN = 10_000
MAX_TIME_MS = 24 * 60 * 60 * 1000
USERNAME_RE = re.compile(r"[A-Za-z0-9_]{3,20}")


# --- helpers -------------------------------------------------------------------


def _json_body() -> dict:
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        abort(400, description="Expected a JSON object body")
    return body


def _completed_ids(db, user_id: str) -> tuple[list[dict], set[str]]:
    completions = db.list_completions(user_id)
    return completions, {c["lab_id"] for c in completions}


def _labs_by_storyline(labs: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for lab in labs:
        grouped.setdefault(lab["storyline_id"], []).append(lab)
    for group in grouped.values():
        group.sort(key=lambda l: l["order_index"])
    return grouped


def _profile_or_create(db, user) -> dict:
    profile = db.get_profile(user.id)
    if profile is None:
        # The signup trigger should have created it; heal if it didn't.
        if user.is_anonymous or not user.email:
            name = "guest_" + user.id.replace("-", "")[:8]
        else:
            name = user.email.split("@")[0]
        db.create_profile(user.id, name)
        profile = db.get_profile(user.id)
    return profile


def _badge_json(badge_id: str) -> dict:
    b = BADGES_BY_ID[badge_id]
    return {"id": b.id, "name": b.name, "description": b.description, "icon": b.icon}


def _public_lab(lab: dict) -> dict:
    return {
        "slug": lab["slug"],
        "title": lab["title"],
        "description": lab.get("description"),
        "cipher_type": lab["cipher_type"],
        "order_index": lab["order_index"],
        "xp_reward": lab["xp_reward"],
        "is_boss": lab.get("is_boss", False),
        "skills": lab.get("skills") or [],
    }


def _storyline_summary(s: dict, labs: list[dict], completed: set[str]) -> dict:
    statuses = progress.lab_statuses(labs, completed)
    done = sum(1 for st in statuses.values() if st == "completed")
    # Suggested next lab: the first one (in story order) not yet completed.
    next_lab = next((l for l in labs if statuses[l["id"]] == "unlocked"), None)
    return {
        "slug": s["slug"],
        "title": s["title"],
        "theme": s.get("theme"),
        "vibe": s.get("vibe"),
        "description": s.get("description"),
        "difficulty": s["difficulty"],
        "available": bool(s.get("available")) and bool(labs),
        "reward": s.get("reward"),
        "preview": s.get("preview") or [],
        "labs_total": len(labs) if labs else len(s.get("preview") or []),
        "labs_completed": done,
        "next_lab_slug": next_lab["slug"] if next_lab else None,
    }


def _load_lab_for_user(slug: str):
    """Fetch a lab and enforce storyline availability (+ unlock order, if enabled)."""
    db = get_db()
    lab = db.get_lab(slug)
    if lab is None:
        abort(404, description="Lab not found")
    storyline = next((s for s in db.list_storylines() if s["id"] == lab["storyline_id"]), None)
    if storyline is None or not storyline.get("available"):
        abort(403, description="This storyline isn't available yet")
    siblings = [l for l in db.list_labs() if l["storyline_id"] == lab["storyline_id"]]
    siblings.sort(key=lambda l: l["order_index"])
    _, completed = _completed_ids(db, g.user.id)
    statuses = progress.lab_statuses(siblings, completed)
    if statuses[lab["id"]] == "locked":
        abort(403, description="Locked. Finish the previous lab first.")
    return db, lab, storyline, siblings, statuses


def _next_lab(siblings: list[dict], lab: dict) -> dict | None:
    later = [l for l in siblings if l["order_index"] > lab["order_index"]]
    return {"slug": later[0]["slug"], "title": later[0]["title"]} if later else None


# --- routes ------------------------------------------------------------------------


@bp.get("/health")
@limiter.exempt
def health():
    return jsonify(ok=True, sandbox=bool(current_app.config["CC"].sandbox_url))


@bp.get("/me")
@require_user
def me():
    db = get_db()
    profile = _profile_or_create(db, g.user)

    storylines = [s for s in db.list_storylines() if s.get("available")]
    grouped = _labs_by_storyline(db.list_labs())
    _, completed = _completed_ids(db, g.user.id)

    # "Continue journey" target: the most recently played storyline that still has an open lab.
    lab_to_storyline = {l["id"]: l["storyline_id"] for labs in grouped.values() for l in labs}
    recent_storylines: list[str] = []
    for a in db.list_attempts(g.user.id):
        sid = lab_to_storyline.get(a["lab_id"])
        if sid and sid not in recent_storylines:
            recent_storylines.append(sid)
    if any(l in completed for l in lab_to_storyline):
        recent_storylines += [s["id"] for s in storylines if s["id"] not in recent_storylines]

    continue_info = None
    for sid in recent_storylines:
        s = next((s for s in storylines if s["id"] == sid), None)
        if not s:
            continue
        summary = _storyline_summary(s, grouped.get(sid, []), completed)
        if summary["next_lab_slug"]:
            nxt = next(l for l in grouped[sid] if l["slug"] == summary["next_lab_slug"])
            continue_info = {
                "storyline_slug": s["slug"],
                "storyline_title": s["title"],
                "lab_slug": nxt["slug"],
                "lab_title": nxt["title"],
                "labs_completed": summary["labs_completed"],
                "labs_total": summary["labs_total"],
            }
            break

    return jsonify(
        id=g.user.id,
        email=g.user.email,
        is_anonymous=g.user.is_anonymous,
        username=profile["username"],
        avatar_id=profile["avatar_id"],
        avatar_chosen=profile.get("avatar_chosen", False),
        **progress.level_info(profile["xp"]),
        continue_journey=continue_info,
    )


@bp.patch("/me")
@require_user
@limiter.limit("20 per minute")
def update_me():
    body = _json_body()
    fields: dict = {}
    if "avatar_id" in body:
        avatar_id = body["avatar_id"]
        if not isinstance(avatar_id, int) or isinstance(avatar_id, bool) or not 0 <= avatar_id <= 3:
            abort(400, description="avatar_id must be an integer 0-3")
        fields.update(avatar_id=avatar_id, avatar_chosen=True)
    if "username" in body:
        username = body["username"]
        if not isinstance(username, str) or not USERNAME_RE.fullmatch(username):
            abort(400, description="Username must be 3-20 characters: letters, numbers, underscores.")
        fields["username"] = username
    if not fields:
        abort(400, description="Nothing to update")
    try:
        get_db().update_profile(g.user.id, fields)
    except Exception as e:  # unique violation on username
        if "username" in fields and ("duplicate" in str(e).lower() or "23505" in str(e)):
            abort(409, description="That username is taken.")
        raise
    return jsonify(ok=True, **fields)


@bp.get("/storylines")
@require_user
def storylines():
    db = get_db()
    grouped = _labs_by_storyline(db.list_labs())
    _, completed = _completed_ids(db, g.user.id)
    return jsonify([_storyline_summary(s, grouped.get(s["id"], []), completed) for s in db.list_storylines()])


@bp.get("/storylines/<slug>")
@require_user
def storyline_detail(slug: str):
    db = get_db()
    s = db.get_storyline(slug)
    if s is None:
        abort(404, description="Storyline not found")
    labs = _labs_by_storyline(db.list_labs()).get(s["id"], [])
    _, completed = _completed_ids(db, g.user.id)
    statuses = progress.lab_statuses(labs, completed)
    return jsonify(
        **_storyline_summary(s, labs, completed),
        labs=[{**_public_lab(l), "status": statuses[l["id"]]} for l in labs],
    )


@bp.get("/labs/<slug>")
@require_user
def lab_detail(slug: str):
    db, lab, storyline, siblings, statuses = _load_lab_for_user(slug)
    solution = db.get_solution(lab["id"]) or {"solution": "", "hints": []}
    state = db.get_progress(g.user.id, lab["id"]) or {"hints_used": 0, "revealed": False}
    hints = solution.get("hints") or []
    payload = dict(lab.get("payload") or {})
    payload.pop("outro", None)  # only sent after solving
    return jsonify(
        **_public_lab(lab),
        story_segment=lab.get("story_segment"),
        challenge_prompt=lab.get("challenge_prompt"),
        payload=payload,
        status=statuses[lab["id"]],
        storyline={"slug": storyline["slug"], "title": storyline["title"]},
        lab_number=[l["id"] for l in siblings].index(lab["id"]) + 1,
        labs_total=len(siblings),
        hints=hints[: state["hints_used"]],
        hints_total=len(hints),
        revealed=state["revealed"],
        solution=solution["solution"].split("|")[0] if state["revealed"] else None,
        attempts=db.count_attempts(g.user.id, lab["id"]),
        xp_if_solved=progress.xp_for_completion(lab["xp_reward"], state["hints_used"], state["revealed"]),
        next_lab=_next_lab(siblings, lab),
        outro=(lab.get("payload") or {}).get("outro") if statuses[lab["id"]] == "completed" else None,
    )


@bp.post("/labs/<slug>/hint")
@require_user
@limiter.limit("30 per minute")
def lab_hint(slug: str):
    db, lab, *_ = _load_lab_for_user(slug)
    hints = (db.get_solution(lab["id"]) or {}).get("hints") or []
    if not hints:
        abort(404, description="This lab has no hints")
    used = db.use_hint(g.user.id, lab["id"], len(hints))
    revealed = (db.get_progress(g.user.id, lab["id"]) or {}).get("revealed", False)
    return jsonify(
        hints=hints[:used],
        hints_total=len(hints),
        xp_if_solved=progress.xp_for_completion(lab["xp_reward"], used, revealed),
    )


@bp.post("/labs/<slug>/reveal")
@require_user
@limiter.limit("10 per minute")
def lab_reveal(slug: str):
    db, lab, *_ = _load_lab_for_user(slug)
    solution = db.get_solution(lab["id"])
    if not solution:
        abort(500, description="Lab has no solution configured")
    db.set_revealed(g.user.id, lab["id"])
    return jsonify(solution=solution["solution"].split("|")[0], revealed=True, xp_if_solved=0)


@bp.post("/labs/<slug>/submit")
@require_user
@limiter.limit("20 per minute")
def lab_submit(slug: str):
    body = _json_body()
    answer = body.get("answer")
    if not isinstance(answer, str) or not answer.strip():
        abort(400, description="Answer is required")
    if len(answer) > MAX_ANSWER_LEN:
        abort(400, description=f"Answers are at most {MAX_ANSWER_LEN} characters")
    time_ms = body.get("time_taken_ms")
    time_ms = int(time_ms) if isinstance(time_ms, (int, float)) and 0 <= time_ms <= MAX_TIME_MS else None

    db, lab, _, siblings, _ = _load_lab_for_user(slug)
    solution = db.get_solution(lab["id"])
    if not solution:
        abort(500, description="Lab has no solution configured")

    correct = answer_matches(answer, solution["solution"])
    db.insert_attempt(g.user.id, lab["id"], answer.strip(), correct, time_ms)
    attempts = db.count_attempts(g.user.id, lab["id"])

    if not correct:
        return jsonify(correct=False, attempts=attempts)

    state = db.get_progress(g.user.id, lab["id"]) or {"hints_used": 0, "revealed": False}
    xp = progress.xp_for_completion(lab["xp_reward"], state["hints_used"], state["revealed"])
    first = db.record_completion(
        g.user.id, lab["id"], attempts, time_ms, state["hints_used"], state["revealed"], xp
    )

    new_badges: list[dict] = []
    profile = db.get_profile(g.user.id)
    if first:
        completions, _ = _completed_ids(db, g.user.id)
        owned = {b["badge_id"] for b in db.list_badges(g.user.id)}
        qualifies = badges_for_completion(
            lab_slug=lab["slug"],
            attempts=attempts,
            hints_used=state["hints_used"],
            revealed=state["revealed"],
            time_ms=time_ms,
            total_completed=len(completions),
            total_xp=profile["xp"],
        )
        fresh = [b.id for b in BADGES if b.id in qualifies and b.id not in owned]
        db.add_badges(g.user.id, fresh)
        new_badges = [_badge_json(b) for b in fresh]

    return jsonify(
        correct=True,
        attempts=attempts,
        first_completion=first,
        xp_awarded=xp if first else 0,
        new_badges=new_badges,
        level=progress.level_info(profile["xp"]),
        next_lab=_next_lab(siblings, lab),
        outro=(lab.get("payload") or {}).get("outro"),
    )


@bp.get("/dashboard")
@require_user
def dashboard():
    db = get_db()
    profile = _profile_or_create(db, g.user)
    storylines = db.list_storylines()
    labs = db.list_labs()
    grouped = _labs_by_storyline(labs)
    completions, completed = _completed_ids(db, g.user.id)
    attempts = db.list_attempts(g.user.id)
    earned = {b["badge_id"]: b["earned_at"] for b in db.list_badges(g.user.id)}
    labs_by_id = {l["id"]: l for l in labs}
    storyline_by_id = {s["id"]: s for s in storylines}

    summaries = [_storyline_summary(s, grouped.get(s["id"], []), completed) for s in storylines]
    times = [c["time_taken_ms"] for c in completions if c.get("time_taken_ms")]
    incorrect = sum(1 for a in attempts if not a["correct"])

    completed_labs = []
    for c in sorted(completions, key=lambda c: c["first_completed_at"], reverse=True):
        lab = labs_by_id.get(c["lab_id"])
        if not lab:
            continue
        completed_labs.append(
            {
                "slug": lab["slug"],
                "title": lab["title"],
                "storyline_title": storyline_by_id.get(lab["storyline_id"], {}).get("title"),
                "completed_at": c["first_completed_at"],
                "attempts": c["attempts_count"],
                "time_taken_ms": c.get("time_taken_ms"),
                "hints_used": c.get("hints_used", 0),
                "revealed": c.get("revealed", False),
                "xp_awarded": c.get("xp_awarded", 0),
            }
        )

    playable_labs = [l for l in labs if storyline_by_id.get(l["storyline_id"], {}).get("available")]
    return jsonify(
        profile={
            "username": profile["username"],
            "avatar_id": profile["avatar_id"],
            "is_anonymous": g.user.is_anonymous,
            **progress.level_info(profile["xp"]),
        },
        stats={
            "labs_completed": len(completed),
            "labs_total": len(playable_labs),
            "storylines_completed": sum(
                1 for s in summaries if s["available"] and s["labs_completed"] == s["labs_total"]
            ),
            "total_attempts": len(attempts),
            "incorrect_submissions": incorrect,
            "accuracy": round(100 * (len(attempts) - incorrect) / len(attempts)) if attempts else None,
            "avg_completion_ms": int(sum(times) / len(times)) if times else None,
            "total_time_ms": sum(times),
            "hints_used": sum(c.get("hints_used", 0) for c in completions),
            "solutions_revealed": sum(1 for c in completions if c.get("revealed")),
        },
        badges=[
            {**_badge_json(b.id), "earned": b.id in earned, "earned_at": earned.get(b.id)} for b in BADGES
        ],
        storylines=summaries,
        completed_labs=completed_labs,
        skills=progress.skill_ranks(playable_labs, completed),
    )


@bp.post("/sandbox/run")
@require_user
@limiter.limit("10 per minute")
def sandbox_run():
    """Proxy code execution to the isolated sandbox service (see /sandbox).
    User code never runs inside this API process."""
    cfg = current_app.config["CC"]
    if not cfg.sandbox_url:
        abort(503, description="The code sandbox isn't configured on this server.")
    body = _json_body()
    code = body.get("code")
    if not isinstance(code, str) or not code.strip():
        abort(400, description="code is required")
    if len(code) > MAX_CODE_LEN:
        abort(400, description=f"Code is limited to {MAX_CODE_LEN} characters")

    import requests

    try:
        r = requests.post(
            f"{cfg.sandbox_url}/run",
            json={"code": code},
            headers={"X-Sandbox-Token": cfg.sandbox_token},
            timeout=20,
        )
    except requests.RequestException:
        abort(502, description="The sandbox is unreachable. It may be waking up, so try again.")
    if r.status_code != 200:
        abort(502, description="The sandbox rejected the request.")
    data = r.json()
    return jsonify(
        stdout=str(data.get("stdout", ""))[:20_000],
        stderr=str(data.get("stderr", ""))[:20_000],
        exit_code=data.get("exit_code"),
        timed_out=bool(data.get("timed_out")),
    )
