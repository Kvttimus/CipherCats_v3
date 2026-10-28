import pytest

from app import create_app
from app.config import Config
from tests.fakes import FakeRepo

AUTH = {"Authorization": "Bearer tok"}


@pytest.fixture()
def repo():
    r = FakeRepo()
    r.add_user("tok", "u1")
    return r


@pytest.fixture()
def client(repo):
    app = create_app(Config(rate_limit_enabled=False), db=repo)
    return app.test_client()


def test_requires_auth(client):
    assert client.get("/api/me").status_code == 401
    assert client.get("/api/me", headers={"Authorization": "Bearer nope"}).status_code == 401
    assert client.get("/api/health").status_code == 200


def test_me_and_avatar(client):
    me = client.get("/api/me", headers=AUTH).get_json()
    assert me["level"] == 1 and me["avatar_chosen"] is False and me["continue_journey"] is None
    assert client.patch("/api/me", json={"avatar_id": 9}, headers=AUTH).status_code == 400
    assert client.patch("/api/me", json={"avatar_id": 2}, headers=AUTH).status_code == 200
    assert client.get("/api/me", headers=AUTH).get_json()["avatar_chosen"] is True


def test_username_update(client, repo):
    repo.add_user("tok2", "taken_name")
    assert client.patch("/api/me", json={"username": "x"}, headers=AUTH).status_code == 400
    assert client.patch("/api/me", json={"username": "taken_name"}, headers=AUTH).status_code == 409
    assert client.patch("/api/me", json={"username": "agent_k"}, headers=AUTH).status_code == 200
    assert client.patch("/api/me", json={}, headers=AUTH).status_code == 400


def test_storylines_list(client):
    data = client.get("/api/storylines", headers=AUTH).get_json()
    cq = data[0]
    assert cq["slug"] == "codebreaker-quest" and cq["available"] and cq["labs_total"] == 5
    assert cq["next_lab_slug"] == "forgotten-shift"
    pp = data[1]
    assert pp["slug"] == "puzzles-of-the-past" and pp["available"] and pp["labs_total"] == 5
    assert all(not s["available"] for s in data[2:])


def test_storylines_are_independent(client):
    # Starting a second storyline doesn't require finishing the first...
    assert client.get("/api/labs/caesars-scroll", headers=AUTH).status_code == 200
    # ...but labs inside it still unlock in order.
    assert client.get("/api/labs/enigma-enigma", headers=AUTH).status_code == 403
    ok = client.post("/api/labs/caesars-scroll/submit", json={"answer": "Brutus"}, headers=AUTH).get_json()
    assert ok["correct"] and ok["next_lab"]["slug"] == "enigma-enigma"
    assert client.get("/api/labs/enigma-enigma", headers=AUTH).status_code == 200


def test_lab_never_leaks_solution(client):
    lab = client.get("/api/labs/forgotten-shift", headers=AUTH).get_json()
    assert lab["solution"] is None and lab["hints"] == [] and lab["hints_total"] == 3
    assert "outro" not in lab["payload"]
    assert "MEET" not in str(lab)


def test_later_labs_locked_until_earlier_ones_done(client):
    assert client.get("/api/labs/twin-vs-secret", headers=AUTH).status_code == 403
    assert client.post("/api/labs/twin-vs-secret/submit", json={"answer": "OBSIDIAN"}, headers=AUTH).status_code == 403


def test_free_order_mode(client, monkeypatch):
    from app import progress

    monkeypatch.setattr(progress, "SEQUENTIAL_UNLOCK", False)
    boss = client.get("/api/labs/great-decryption", headers=AUTH)
    assert boss.status_code == 200 and boss.get_json()["status"] == "unlocked"
    ok = client.post("/api/labs/twin-vs-secret/submit", json={"answer": "obsidian"}, headers=AUTH).get_json()
    assert ok["correct"] and ok["xp_awarded"] == 150
    me = client.get("/api/me", headers=AUTH).get_json()
    assert me["continue_journey"]["lab_slug"] == "forgotten-shift"


def test_submit_flow_awards_xp_once_and_unlocks(client, repo):
    wrong = client.post("/api/labs/forgotten-shift/submit", json={"answer": "nope"}, headers=AUTH).get_json()
    assert wrong == {"correct": False, "attempts": 1}

    ok = client.post(
        "/api/labs/forgotten-shift/submit",
        json={"answer": "meet at the lighthouse at midnight", "time_taken_ms": 60_000},
        headers=AUTH,
    ).get_json()
    assert ok["correct"] and ok["first_completion"] and ok["xp_awarded"] == 100
    assert {b["id"] for b in ok["new_badges"]} == {"beginner", "shift-master", "no-hints", "speed-demon"}
    assert ok["next_lab"]["slug"] == "twin-vs-secret"

    again = client.post(
        "/api/labs/forgotten-shift/submit", json={"answer": "MEET AT THE LIGHTHOUSE AT MIDNIGHT"}, headers=AUTH
    ).get_json()
    assert again["xp_awarded"] == 0 and again["new_badges"] == []
    assert repo.profiles["u1"]["xp"] == 100

    assert client.get("/api/labs/twin-vs-secret", headers=AUTH).status_code == 200
    me = client.get("/api/me", headers=AUTH).get_json()
    assert me["continue_journey"]["lab_slug"] == "twin-vs-secret"


def test_hints_reduce_xp_and_reveal_zeroes_it(client):
    h = client.post("/api/labs/forgotten-shift/hint", headers=AUTH).get_json()
    assert len(h["hints"]) == 1 and h["xp_if_solved"] == 85
    for _ in range(5):
        h = client.post("/api/labs/forgotten-shift/hint", headers=AUTH).get_json()
    assert len(h["hints"]) == 3

    r = client.post("/api/labs/forgotten-shift/reveal", headers=AUTH).get_json()
    assert r["solution"] == "MEET AT THE LIGHTHOUSE AT MIDNIGHT"
    ok = client.post("/api/labs/forgotten-shift/submit", json={"answer": r["solution"]}, headers=AUTH).get_json()
    assert ok["correct"] and ok["xp_awarded"] == 0
    assert {b["id"] for b in ok["new_badges"]} == {"beginner", "shift-master"}


def test_dashboard(client):
    client.post("/api/labs/forgotten-shift/submit", json={"answer": "x"}, headers=AUTH)
    client.post("/api/labs/forgotten-shift/submit", json={"answer": "MEET AT THE LIGHTHOUSE AT MIDNIGHT", "time_taken_ms": 5000}, headers=AUTH)
    d = client.get("/api/dashboard", headers=AUTH).get_json()
    assert d["stats"]["labs_completed"] == 1 and d["stats"]["labs_total"] == 10
    assert d["stats"]["incorrect_submissions"] == 1 and d["stats"]["accuracy"] == 50
    assert d["completed_labs"][0]["slug"] == "forgotten-shift"
    assert any(b["earned"] for b in d["badges"])
    skills = {s["skill"]: s["rank"] for s in d["skills"]}
    assert skills["Classical Ciphers"] == "Beginner" and skills["Asymmetric Cryptography"] == "Locked"


def test_input_validation(client):
    assert client.post("/api/labs/forgotten-shift/submit", json={"answer": "A" * 600}, headers=AUTH).status_code == 400
    assert client.post("/api/labs/forgotten-shift/submit", data="x", headers=AUTH).status_code == 400
    assert client.get("/api/labs/nope", headers=AUTH).status_code == 404


def test_sandbox_disabled_without_config(client):
    assert client.post("/api/sandbox/run", json={"code": "print(1)"}, headers=AUTH).status_code == 503
