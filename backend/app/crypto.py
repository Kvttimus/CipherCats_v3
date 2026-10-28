"""Classical cipher helpers.

Used to build lab content (see ``content/``), to verify seed data in tests, and
to normalise submitted answers. The frontend terminal has a TypeScript twin of
these in ``frontend/src/lib/crypto``.
"""

from __future__ import annotations

import base64
import re
from collections import Counter

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def _shift_char(ch: str, shift: int) -> str:
    if "A" <= ch <= "Z":
        return chr((ord(ch) - 65 + shift) % 26 + 65)
    if "a" <= ch <= "z":
        return chr((ord(ch) - 97 + shift) % 26 + 97)
    return ch


def caesar_encrypt(text: str, shift: int) -> str:
    return "".join(_shift_char(c, shift) for c in text)


def caesar_decrypt(text: str, shift: int) -> str:
    return caesar_encrypt(text, -shift)


def _vigenere(text: str, key: str, sign: int) -> str:
    shifts = [ord(k) - 65 for k in key.upper() if k.isalpha()]
    if not shifts:
        raise ValueError("key must contain letters")
    out, i = [], 0
    for c in text:
        if c.isalpha() and c.isascii():
            out.append(_shift_char(c, sign * shifts[i % len(shifts)]))
            i += 1
        else:
            out.append(c)
    return "".join(out)


def vigenere_encrypt(text: str, key: str) -> str:
    return _vigenere(text, key, 1)


def vigenere_decrypt(text: str, key: str) -> str:
    return _vigenere(text, key, -1)


def modinv(a: int, m: int) -> int:
    return pow(a, -1, m)


def affine_encrypt(text: str, a: int, b: int) -> str:
    modinv(a, 26)  # raises ValueError when a has no inverse
    out = []
    for c in text:
        if "A" <= c <= "Z":
            out.append(chr((a * (ord(c) - 65) + b) % 26 + 65))
        elif "a" <= c <= "z":
            out.append(chr((a * (ord(c) - 97) + b) % 26 + 97))
        else:
            out.append(c)
    return "".join(out)


def affine_decrypt(text: str, a: int, b: int) -> str:
    inv = modinv(a, 26)
    out = []
    for c in text:
        if "A" <= c <= "Z":
            out.append(chr(inv * (ord(c) - 65 - b) % 26 + 65))
        elif "a" <= c <= "z":
            out.append(chr(inv * (ord(c) - 97 - b) % 26 + 97))
        else:
            out.append(c)
    return "".join(out)


def b64encode(text: str) -> str:
    return base64.b64encode(text.encode()).decode()


def b64decode(text: str) -> str:
    return base64.b64decode(text.encode()).decode()


def letter_frequencies(text: str) -> list[tuple[str, int]]:
    letters = [c for c in text.upper() if c in ALPHABET]
    return Counter(letters).most_common()


def index_of_coincidence(text: str) -> float:
    letters = [c for c in text.upper() if c in ALPHABET]
    n = len(letters)
    if n < 2:
        return 0.0
    counts = Counter(letters)
    return sum(v * (v - 1) for v in counts.values()) / (n * (n - 1))


def columns(text: str, n: int) -> list[str]:
    letters = [c for c in text.upper() if c in ALPHABET]
    return ["".join(letters[i::n]) for i in range(n)]


_NON_ANSWER = re.compile(r"[^A-Z0-9 ]+")
_SPACES = re.compile(r"\s+")


def normalize_answer(s: str) -> str:
    """Uppercase, drop punctuation, collapse whitespace."""
    s = _NON_ANSWER.sub("", s.upper().replace("\n", " "))
    return _SPACES.sub(" ", s).strip()


def answer_matches(submitted: str, solution: str) -> bool:
    """``solution`` may list accepted alternatives separated by ``|``."""
    got = normalize_answer(submitted)
    return bool(got) and any(got == normalize_answer(alt) for alt in solution.split("|"))
