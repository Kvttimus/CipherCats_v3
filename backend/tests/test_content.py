"""Every lab must actually be solvable with the techniques its hints describe."""

from app.crypto import (
    affine_decrypt,
    answer_matches,
    b64decode,
    caesar_decrypt,
    columns,
    index_of_coincidence,
    letter_frequencies,
    modinv,
    normalize_answer,
    vigenere_decrypt,
)
from content import STORYLINES
from content import codebreaker as cb

LABS = {lab["slug"]: lab for lab in cb.LABS}


def test_codebreaker_has_five_labs_ending_in_boss():
    assert len(cb.LABS) == 5
    assert cb.LABS[-1].get("is_boss")
    assert len({s["slug"] for s in STORYLINES}) == len(STORYLINES)


def test_every_lab_has_three_hints_and_intro():
    for lab in cb.LABS:
        assert len(lab["hints"]) == 3, lab["slug"]
        assert lab["payload"]["intro"], lab["slug"]
        assert lab["payload"]["files"], lab["slug"]


def test_caesar_lab():
    ct = LABS["forgotten-shift"]["payload"]["files"]["intercept.txt"]
    candidates = [caesar_decrypt(ct, k) for k in range(1, 26)]
    assert any(answer_matches(c, LABS["forgotten-shift"]["solution"]) for c in candidates)


def test_vigenere_lab_columns_crack_by_frequency():
    ct = LABS["twin-vs-secret"]["payload"]["files"]["twins_letter.txt"]
    key = "".join(chr((ord(letter_frequencies(col)[0][0]) - ord("E")) % 26 + 65) for col in columns(ct, 4))
    assert key == cb.L2_KEY
    assert "PASSWORD FOR THE INNER DOOR IS OBSIDIAN" in vigenere_decrypt(ct, key)


def test_affine_lab_crib_solves_keys():
    ct = LABS["modular-minds"]["payload"]["files"]["report.txt"]
    b = ord(ct[0]) - 65  # A -> b
    t_cipher = ord(ct[4]) - 65  # 5th letter of AGENT is T(19)
    a = (t_cipher - b) * modinv(19, 26) % 26
    assert (a, b) == (cb.L3_A, cb.L3_B)
    assert normalize_answer(affine_decrypt(ct, a, b)).endswith("LANTERN")


def test_frequency_lab_top_letters_solve_affine():
    ct = LABS["frequency-trap"]["payload"]["files"]["dispatch.txt"]
    assert index_of_coincidence(ct) > 0.06
    (e_c, _), (t_c, _) = letter_frequencies(ct)[:2]
    y_e, y_t = ord(e_c) - 65, ord(t_c) - 65
    a = (y_t - y_e) * modinv(15, 26) % 26
    b = (y_e - 4 * a) % 26
    assert (a, b) == (cb.L4_A, cb.L4_B)
    assert "SILVER TEMPEST" in affine_decrypt(ct, a, b)


def test_boss_lab_chain():
    files = LABS["great-decryption"]["payload"]["files"]
    step1 = b64decode(files["scroll_1.txt"])
    assert cb.L5_FRAG1_PLAIN in [caesar_decrypt(step1, k) for k in range(1, 26)]
    assert vigenere_decrypt(files["scroll_2.txt"], cb.L5_KEY) == cb.L5_FRAG2_PLAIN
    plain = affine_decrypt(files["scroll_3.txt"], cb.L5_A, cb.L5_B)
    assert answer_matches("the clock tower", LABS["great-decryption"]["solution"])
    assert "CLOCK TOWER" in plain


def test_answer_normalisation():
    assert answer_matches("  meet at the   lighthouse at midnight! ", cb.L1_PLAIN)
    assert not answer_matches("", "X")
    assert answer_matches("Clock Tower.", "CLOCK TOWER|THE CLOCK TOWER")
    assert not answer_matches("tower", "CLOCK TOWER|THE CLOCK TOWER")
