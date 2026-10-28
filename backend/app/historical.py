"""Historical cipher machinery for the Puzzles of the Past storyline: Enigma,
the Navajo code-talker alphabet, one-time pads and textbook RSA.

TypeScript twin (used by the terminal): frontend/src/lib/crypto/historical.ts
"""

from __future__ import annotations

# --- Enigma I (rotors I-V, reflector B, ring settings fixed at A) -------------------

ROTORS = {
    "I": ("EKMFLGDQVZNTOWYHXUSPAIBRCJ", "Q"),
    "II": ("AJDKSIRUXBLHWTMCQGZNPYFVOE", "E"),
    "III": ("BDFHJLCPRTXVZNYEIWGAKMUSQO", "V"),
    "IV": ("ESOVPZJAYQUIRHXLNFTGKDCMWB", "J"),
    "V": ("VZBRGITYUPSDNHLXAWMJQOFECK", "Z"),
}
REFLECTOR_B = "YRUHQSLDPXNGOKMIEBFZCWVJAT"


def enigma(text: str, rotors: list[str], start: str) -> str:
    """Encrypt/decrypt (Enigma is its own inverse). ``rotors`` is left→right,
    e.g. ["I", "II", "III"]; ``start`` the three window letters, e.g. "AAA".
    Non-letters are dropped, like on the real machine."""
    if len(rotors) != 3 or len(start) != 3:
        raise ValueError("need 3 rotors and a 3-letter start position")
    wirings = [ROTORS[r][0] for r in rotors]
    notches = [ord(ROTORS[r][1]) - 65 for r in rotors]
    inverse = [[0] * 26 for _ in range(3)]
    for i, w in enumerate(wirings):
        for j, ch in enumerate(w):
            inverse[i][ord(ch) - 65] = j
    pos = [ord(c) - 65 for c in start.upper()]

    out = []
    for ch in text.upper():
        if not "A" <= ch <= "Z":
            continue
        # Stepping, including the middle rotor's famous double step.
        step_middle = pos[2] == notches[2] or pos[1] == notches[1]
        step_left = pos[1] == notches[1]
        pos[2] = (pos[2] + 1) % 26
        if step_middle:
            pos[1] = (pos[1] + 1) % 26
        if step_left:
            pos[0] = (pos[0] + 1) % 26

        c = ord(ch) - 65
        for i in (2, 1, 0):
            c = (ord(wirings[i][(c + pos[i]) % 26]) - 65 - pos[i]) % 26
        c = ord(REFLECTOR_B[c]) - 65
        for i in (0, 1, 2):
            c = (inverse[i][(c + pos[i]) % 26] - pos[i]) % 26
        out.append(chr(c + 65))
    return "".join(out)


# --- Navajo code talkers (simplified: one code word per letter) ---------------------

NAVAJO_ALPHABET = {
    "A": "WOL-LA-CHEE", "B": "SHUSH", "C": "MOASI", "D": "BE", "E": "DZEH", "F": "MA-E",
    "G": "KLIZZIE", "H": "LIN", "I": "TKIN", "J": "TKELE-CHO-GI", "K": "KLIZZIE-YAZZIE",
    "L": "DIBEH-YAZZIE", "M": "NA-AS-TSO-SI", "N": "NESH-CHEE", "O": "NE-AHS-JAH",
    "P": "BI-SO-DIH", "Q": "CA-YEILTH", "R": "GAH", "S": "DIBEH", "T": "THAN-ZIE",
    "U": "NO-DA-IH", "V": "A-KEH-DI-GLINI", "W": "GLOE-IH", "X": "AL-NA-AS-DZOH",
    "Y": "TSAH-AS-ZIH", "Z": "BESH-DO-TLIZ",
}
NAVAJO_TERMS = {
    "SUBMARINE": "BESH-LO", "BATTLESHIP": "LO-TSO", "DESTROYER": "CA-LO",
    "FIGHTER": "DA-HE-TIH-HI", "BOMBER": "JAY-SHO", "DIVEBOMBER": "GINI",
}


def navajo_encode(text: str) -> str:
    """Spell each word with code words, or use a single code word for military terms.
    Letters are separated by spaces, words by " / "."""
    words = []
    for word in text.upper().split():
        word = "".join(c for c in word if c.isalpha())
        if word in NAVAJO_TERMS:
            words.append(NAVAJO_TERMS[word])
        elif word:
            words.append(" ".join(NAVAJO_ALPHABET[c] for c in word))
    return " / ".join(words)


def navajo_decode(text: str) -> str:
    lookup = {v: k for k, v in NAVAJO_ALPHABET.items()}
    terms = {v: f"[{k}]" for k, v in NAVAJO_TERMS.items()}
    words = []
    for group in text.split("/"):
        tokens = group.split()
        if len(tokens) == 1 and tokens[0] in terms:
            words.append(terms[tokens[0]])
        else:
            words.append("".join(lookup.get(t, "?") for t in tokens))
    return " ".join(words)


# --- One-time pad over A-Z (c = p + k mod 26) --------------------------------------


def _letters(text: str) -> str:
    return "".join(c for c in text.upper() if "A" <= c <= "Z")


def otp_encrypt(plain: str, key: str) -> str:
    p, k = _letters(plain), _letters(key)
    if len(k) < len(p):
        raise ValueError("a one-time pad must be at least as long as the message")
    return "".join(chr((ord(a) + ord(b) - 130) % 26 + 65) for a, b in zip(p, k))


def otp_key(plain: str, cipher: str) -> str:
    """Recover the pad letters wherever both plaintext and ciphertext are known."""
    return "".join(chr((ord(c) - ord(p)) % 26 + 65) for p, c in zip(_letters(plain), _letters(cipher)))


def otp_decrypt(cipher: str, key: str) -> str:
    """Decrypt as far as the key reaches; unknown positions become '?'."""
    c, k = _letters(cipher), _letters(key)
    return "".join(chr((ord(c[i]) - ord(k[i])) % 26 + 65) if i < len(k) else "?" for i in range(len(c)))


def group5(text: str) -> str:
    t = _letters(text)
    return " ".join(t[i : i + 5] for i in range(0, len(t), 5))


# --- Textbook RSA, one letter per block (A=1 … Z=26) -------------------------------


def rsa_encrypt_letters(text: str, e: int, n: int) -> list[int]:
    return [pow(ord(c) - 64, e, n) for c in _letters(text)]


def rsa_decrypt_letters(blocks: list[int], d: int, n: int) -> str:
    return "".join(chr(pow(c, d, n) + 64) for c in blocks)
