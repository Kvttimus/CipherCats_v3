"""Puzzles of the Past: every lab must be solvable the way its hints describe."""

from app.crypto import answer_matches, caesar_decrypt, normalize_answer, vigenere_decrypt
from app.historical import enigma, navajo_decode, navajo_encode, otp_decrypt, otp_key, rsa_decrypt_letters
from content import STORYLINES
from content import puzzles as pz

LABS = {lab["slug"]: lab for lab in pz.LABS}


def files(slug):
    return LABS[slug]["payload"]["files"]


def test_storyline_shape():
    assert len(pz.LABS) == 5 and pz.LABS[-1]["is_boss"]
    assert sum(l["xp_reward"] for l in pz.LABS) == 800
    assert all(len(l["hints"]) == 3 for l in pz.LABS)
    slugs = [l["slug"] for s in STORYLINES for l in s.get("labs", [])]
    assert len(slugs) == len(set(slugs)), "lab slugs must be unique across storylines"


def test_enigma_reference_vectors():
    assert enigma("AAAAA", ["I", "II", "III"], "AAA") == "BDZGO"
    assert enigma("AAAA", ["I", "II", "III"], "ADU") == "EQIB"  # middle-rotor double step


def test_caesar_scroll():
    plain = caesar_decrypt(files("caesars-scroll")["scroll.txt"], 3)
    assert answer_matches(plain.split()[-1], LABS["caesars-scroll"]["solution"])


def test_enigma_lab_only_the_lazy_key_works():
    ct = files("enigma-enigma")["intercept.txt"]
    assert "ICELAND" in enigma(ct, ["I", "II", "III"], "QWE")
    for wrong in ("AAA", "ABC", "XYZ"):
        assert "ICELAND" not in enigma(ct, ["I", "II", "III"], wrong)


def test_navajo_transmission():
    decoded = navajo_decode(files("navajo-net")["transmission.txt"])
    assert decoded == "[FIGHTER] COVER REQUESTED FLAG RAISED ON SURIBACHI"
    assert navajo_decode(navajo_encode("submarine sighted")) == "[SUBMARINE] SIGHTED"


def test_otp_reuse_reveals_codename():
    f = files("cold-war-crack")
    key = otp_key(pz.P4_HEADER, f["cable_a.txt"])
    assert "NIGHTINGALE" in otp_decrypt(f["cable_b.txt"], key)
    assert normalize_answer(otp_decrypt(f["cable_a.txt"], key)).startswith("TOPSECRET")


def test_rsa_hybrid_chain():
    f = files("digital-age-decryption")
    blocks = [int(x) for x in f["session_key.txt"].split()]
    d = pow(17, -1, (53 - 1) * (61 - 1))
    assert d == 2753
    key = rsa_decrypt_letters(blocks, d, 3233)
    assert key == "TURING"
    assert "THE FINAL WORD IS PERSEVERANCE" in vigenere_decrypt(f["message.txt"], key)
