from app import progress
from app.badges import badges_for_completion


def test_levels():
    assert progress.level_info(0)["level"] == 1
    assert progress.level_info(260) == {"level": 2, "xp": 260, "xp_into_level": 10, "xp_for_next": 250}


def test_xp_penalties():
    assert progress.xp_for_completion(200, 0, False) == 200
    assert progress.xp_for_completion(200, 1, False) == 170
    assert progress.xp_for_completion(200, 9, False) == 100  # floor at 50%
    assert progress.xp_for_completion(200, 0, True) == 0


def test_sequential_unlock_by_default():
    labs = [{"id": i, "order_index": i} for i in range(1, 4)]
    assert progress.lab_statuses(labs, set()) == {1: "unlocked", 2: "locked", 3: "locked"}
    assert progress.lab_statuses(labs, {1}) == {1: "completed", 2: "unlocked", 3: "locked"}


def test_free_order_option():
    labs = [{"id": i, "order_index": i} for i in range(1, 4)]
    assert progress.lab_statuses(labs, set(), sequential=False) == {1: "unlocked", 2: "unlocked", 3: "unlocked"}
    assert progress.lab_statuses(labs, {2}, sequential=False) == {1: "unlocked", 2: "completed", 3: "unlocked"}


def test_skill_ranks():
    labs = [{"id": 1, "skills": ["A", "B"]}, {"id": 2, "skills": ["A"]}, {"id": 3, "skills": ["A"]}]
    ranks = {r["skill"]: r["rank"] for r in progress.skill_ranks(labs, {1, 2, 3})}
    assert ranks == {"A": "Expert", "B": "Beginner"}
    assert progress.skill_ranks(labs, set())[0]["rank"] == "Locked"


def test_badges_revealed_forfeits_skill_badges():
    kw = dict(lab_slug="forgotten-shift", attempts=1, hints_used=0, time_ms=1000, total_completed=1, total_xp=100)
    assert badges_for_completion(revealed=False, **kw) == {"beginner", "shift-master", "first-try", "no-hints", "speed-demon"}
    assert badges_for_completion(revealed=True, **kw) == {"beginner", "shift-master"}
