"""Codebreaker Quest — the MVP storyline (classical cryptography, 5 labs).

Story: the Black Paw syndicate is hunting the Celestial Diamond. You, a new
CipherCats recruit, follow their encrypted trail one cipher at a time.
"""

from app.crypto import affine_encrypt, b64encode, caesar_encrypt, vigenere_encrypt

HANDLER = "Agent Marmalade"

# --- Lab 1: Caesar ----------------------------------------------------------
L1_PLAIN = "MEET AT THE LIGHTHOUSE AT MIDNIGHT"
L1_SHIFT = 7

# --- Lab 2: Vigenere (key length known) --------------------------------------
L2_KEY = "TWIN"
L2_PLAIN = (
    "THE COURIER WILL ARRIVE AT THE EASTERN GATE BEFORE THE SECOND BELL. "
    "TELL THE GUARDS THAT THE TWINS SENT YOU. THE PASSWORD FOR THE INNER DOOR IS OBSIDIAN. "
    "REPEAT THE WORD TWICE AND THEN ENTER. TRUST NO ONE WHO CANNOT SPEAK THE WORD. "
    "BURN THIS LETTER AFTER READING. THE ENEMY HAS EYES IN EVERY STREET. "
    "KEEP THE SEVEN SEALS SEPARATE AND SECRET. WE MEET AGAIN WHEN THE THREE TREES ARE GREEN."
)

# --- Lab 3: Affine (known-plaintext crib) ------------------------------------
L3_A, L3_B = 5, 8
L3_PLAIN = (
    "AGENT TWELVE REPORTING. THE MAP ROOM IS GUARDED BY TWO SENTRIES WHO CHANGE SHIFTS AT DUSK. "
    "THE CODEWORD TO OPEN THE MAP ROOM IS LANTERN."
)

# --- Lab 4: Frequency analysis (method unknown to the player: affine) -------
L4_A, L4_B = 9, 14
L4_PLAIN = (
    "THE BLACK PAW SYNDICATE MEETS EVERY TUESDAY EVENING IN THE CELLAR BENEATH THE OLD THEATRE. "
    "THEIR LEADER NEVER SPEAKS; HE SENDS HIS ORDERS THROUGH A NETWORK OF STREET MESSENGERS. "
    "WE BELIEVE THE NEXT TARGET IS THE GREAT VAULT OF THE CENTRAL EXCHANGE. "
    "THE SECRET ENTRANCE TO THE VAULT SITS BEHIND THE THIRTEENTH STATUE IN THE EAST GALLERY. "
    "WHEN THE GUARD CHANGES AT TEN, THE GALLERY STANDS EMPTY FOR SEVEN MINUTES. "
    "THE PHRASE THAT OPENS THE STATUE IS SILVER TEMPEST. GET THERE BEFORE THEY DO."
)

# --- Lab 5: Boss — base64 + Caesar -> Vigenere -> Affine ---------------------
L5_SHIFT = 11
L5_FRAG1_PLAIN = "THE VIGENERE KEY IS WHISKERS"
L5_KEY = "WHISKERS"
L5_FRAG2_PLAIN = "THE LAST SCROLL USES AN AFFINE CIPHER. MULTIPLY BY SEVEN, THEN ADD TEN."
L5_A, L5_B = 7, 10
L5_FRAG3_PLAIN = "THE CELESTIAL DIAMOND RESTS INSIDE THE CLOCK TOWER."


def _line(speaker: str, text: str) -> dict:
    return {"speaker": speaker, "text": text}


LABS = [
    {
        "slug": "forgotten-shift",
        "title": "The Forgotten Shift",
        "cipher_type": "caesar",
        "description": "Decode a basic Caesar cipher using brute force or shift analysis.",
        "skills": ["Classical Ciphers", "Cryptanalysis"],
        "xp_reward": 100,
        "story_segment": (
            "A crumpled parchment was lifted from a Black Paw courier at the docks. The ink is "
            "smudged, but the letters look... shifted. Crack it before dawn, or the rendezvous "
            "goes dark."
        ),
        "challenge_prompt": (
            "Decrypt the intercepted message. It's a Caesar cipher with an unknown shift "
            "between 1 and 25. Submit the full plaintext."
        ),
        "payload": {
            "intro": [
                _line(HANDLER, "Welcome to the CipherCats, recruit. I'm Marmalade, your handler."),
                _line(HANDLER, "The Black Paw syndicate is after the Celestial Diamond. We intend to get there first."),
                _line(HANDLER, "We grabbed this note from one of their couriers. Julius Caesar used ciphers like it 2,000 years ago, so it shouldn't stop a cat like you."),
                _line("you", "Shift every letter back by the same amount. Got it. Which amount?"),
                _line(HANDLER, "That's your job. There are only 25 possibilities. Open the terminal and get to work."),
            ],
            "concept": {
                "title": "Caesar cipher & alphabet wrapping",
                "body": (
                    "Each letter moves a fixed number of places down the alphabet. With a shift of 3, "
                    "A→D, B→E… and at the end it wraps around: X→A, Y→B, Z→C. Number the letters "
                    "A=0…Z=25. Encrypting is (x + k) mod 26 and decrypting is (x − k) mod 26. "
                    "There are only 25 useful keys, so you can simply try them all (brute force)."
                ),
            },
            "files": {"intercept.txt": caesar_encrypt(L1_PLAIN, L1_SHIFT)},
            "tools": ["cat intercept.txt", "caesar-bruteforce $INTERCEPT", "caesar-decrypt <shift> <text>"],
            "outro": "MEET AT THE LIGHTHOUSE AT MIDNIGHT. Pack a coat, recruit. It gets cold on the cliffs.",
        },
        "solution": L1_PLAIN,
        "hints": [
            "Run `caesar-bruteforce $INTERCEPT` in the terminal to see all 25 shifts at once.",
            "Look for the line that reads as English. It mentions a place and a time.",
            "The shift is 7. Run `caesar-decrypt 7 $INTERCEPT`.",
        ],
    },
    {
        "slug": "twin-vs-secret",
        "title": "Twin V's Secret",
        "cipher_type": "vigenere",
        "description": "Crack a Vigenère cipher when you already know the key length.",
        "skills": ["Classical Ciphers", "Cryptanalysis"],
        "xp_reward": 150,
        "story_segment": (
            "The lighthouse keeper is gone, but a letter signed by \"the Twins\" sits under a brass "
            "telescope. It's encrypted with a Vigenère cipher, and a scribble in the margin reads "
            "\"key: 4 letters\". Somewhere in the letter is the password for the lighthouse's inner door."
        ),
        "challenge_prompt": (
            "The key is 4 letters long. Recover the key, decrypt the letter, and submit the "
            "password for the inner door."
        ),
        "payload": {
            "intro": [
                _line(HANDLER, "This one's trickier. It's a Vigenère cipher, which uses several Caesar shifts in rotation."),
                _line("you", "So brute force won't work?"),
                _line(HANDLER, "Not on the whole thing. But if the key is 4 letters, letters 1, 5, 9… all share the same shift."),
                _line(HANDLER, "Split the text into 4 columns and each one is just a Caesar cipher. In English, E is the most common letter."),
            ],
            "concept": {
                "title": "Polyalphabetic substitution",
                "body": (
                    "Vigenère repeats a keyword over the message. Each key letter gives a Caesar shift "
                    "(A=0, B=1…). Because the shift keeps changing, single-letter frequencies are flattened, "
                    "which is why it was called \"le chiffre indéchiffrable\". If you know the key length n, "
                    "every n-th letter uses the same shift. Split the text into n columns and attack each "
                    "column with frequency analysis."
                ),
            },
            "files": {"twins_letter.txt": vigenere_encrypt(L2_PLAIN, L2_KEY)},
            "given": {"Key length": "4"},
            "tools": ["columns 4 $TWINS_LETTER", "freq <column>", "vigenere-decrypt <key> $TWINS_LETTER"],
            "outro": "OBSIDIAN. Say it twice. The inner door swings open and stairs lead down into the dark.",
        },
        "solution": "OBSIDIAN",
        "hints": [
            "Run `columns 4 $TWINS_LETTER` to split the ciphertext into its 4 Caesar columns.",
            "Run `freq` on each column. Assume its most common letter is plaintext E. Key letter = (top letter − E). In column 1 the top letter is X, and X − E = T.",
            "The key is TWIN. Run `vigenere-decrypt TWIN $TWINS_LETTER` and look for the word PASSWORD.",
        ],
    },
    {
        "slug": "modular-minds",
        "title": "Modular Minds",
        "cipher_type": "affine",
        "description": "Break an affine cipher with a known-plaintext crib and modular inverses.",
        "skills": ["Classical Ciphers", "Modular Arithmetic"],
        "xp_reward": 150,
        "story_segment": (
            "Below the lighthouse is a Black Paw map room. A report on the desk is encrypted with an "
            "affine cipher. Every Black Paw report starts with the word AGENT, and that is your way in."
        ),
        "challenge_prompt": (
            "The plaintext starts with \"AGENT\". Use this crib to find the keys a and b, decrypt the "
            "report, and submit the codeword that opens the map room."
        ),
        "payload": {
            "intro": [
                _line(HANDLER, "An affine cipher multiplies each letter by a, then adds b, all mod 26."),
                _line("you", "And to undo it?"),
                _line(HANDLER, "Subtract b, then multiply by the modular inverse of a. That's the number that undoes multiplication mod 26."),
                _line(HANDLER, "You know the first word is AGENT. A is 0, so the first cipher letter gives you b straight away."),
            ],
            "concept": {
                "title": "Modular arithmetic & keyspaces",
                "body": (
                    "E(x) = (a·x + b) mod 26 and D(y) = a⁻¹·(y − b) mod 26. a must be coprime with 26 "
                    "(1,3,5,7,9,11,15,17,19,21,23,25) or no inverse exists. That gives 12 × 26 = 312 keys. "
                    "Each known plaintext→ciphertext pair is one equation, and two pairs solve for a and b. "
                    "Use `alphabet` to look up letter numbers and `modinv` to find inverses."
                ),
            },
            "files": {"report.txt": affine_encrypt(L3_PLAIN, L3_A, L3_B)},
            "given": {"Crib": "message begins with AGENT"},
            "tools": ["alphabet", "modinv <a> 26", "affine-decrypt <a> <b> $REPORT"],
            "outro": "LANTERN. The map room clicks open. On the wall is a list of Black Paw meeting places.",
        },
        "solution": "LANTERN",
        "hints": [
            "A=0, so E(A) = a·0 + b = b. The first cipher letter is I, so b = 8.",
            "T=19 encrypts to Z=25: 19a + 8 ≡ 25 (mod 26), so 19a ≡ 17. Run `modinv 19 26` to get 11, then a ≡ 17·11 mod 26.",
            "a = 5, b = 8. Run `affine-decrypt 5 8 $REPORT`.",
        ],
    },
    {
        "slug": "frequency-trap",
        "title": "The Frequency Trap",
        "cipher_type": "frequency",
        "description": "Identify an unknown cipher with frequency analysis, then break it.",
        "skills": ["Cryptanalysis", "Modular Arithmetic"],
        "xp_reward": 200,
        "story_segment": (
            "The map room's dispatch box holds a long, unlabeled ciphertext. Your handler has no idea "
            "which cipher the Black Paw used this time. All you have is statistics."
        ),
        "challenge_prompt": (
            "Work out which cipher was used, break it, and submit the phrase that opens the statue."
        ),
        "payload": {
            "intro": [
                _line(HANDLER, "No crib, no key length, no idea which cipher. Welcome to real cryptanalysis."),
                _line("you", "Where do I even start?"),
                _line(HANDLER, "Count letters. If one letter dominates, it's a monoalphabetic cipher. The index of coincidence will tell you too."),
                _line(HANDLER, "Then work out whether the top letters are one shift apart, as in Caesar, or something more… modular."),
            ],
            "concept": {
                "title": "Frequency analysis",
                "body": (
                    "Every language has a fingerprint. In English, E ≈ 12.7%, T ≈ 9.1%, A ≈ 8.2%. "
                    "Monoalphabetic ciphers (Caesar, affine, substitution) keep that fingerprint and only "
                    "relabel the letters. The index of coincidence (IC) shows this. English text is about 0.066 "
                    "and random letters are about 0.038. A high IC means one alphabet. Then map the top cipher "
                    "letters to E and T and test each hypothesis."
                ),
            },
            "files": {"dispatch.txt": affine_encrypt(L4_PLAIN, L4_A, L4_B)},
            "tools": ["freq $DISPATCH", "ic $DISPATCH", "modinv <a> 26", "affine-decrypt <a> <b> $DISPATCH"],
            "outro": "SILVER TEMPEST. The Black Paw are going for the Central Exchange vault, and now you know the way in.",
        },
        "solution": "SILVER TEMPEST",
        "hints": [
            "`ic $DISPATCH` is about 0.09, so one alphabet was used. `freq $DISPATCH` shows Y and D far ahead of the rest. Y→E and D→T aren't the same shift, so it isn't Caesar.",
            "Try affine: E(4)→Y(24) and T(19)→D(3). Subtract the two equations: 15a ≡ 3 − 24 ≡ 5 (mod 26). `modinv 15 26` = 7.",
            "a = 9, b = 14. Run `affine-decrypt 9 14 $DISPATCH`.",
        ],
    },
    {
        "slug": "great-decryption",
        "title": "The Great Decryption",
        "cipher_type": "boss",
        "description": "Boss lab: chain every technique you've learned to find the Celestial Diamond.",
        "skills": ["Classical Ciphers", "Cryptanalysis", "Modular Arithmetic"],
        "xp_reward": 400,
        "is_boss": True,
        "story_segment": (
            "Behind the thirteenth statue you find three scrolls left by the vault's designer. Each one "
            "unlocks the next. The Black Paw are seven minutes behind you."
        ),
        "challenge_prompt": (
            "Decode scroll I to get the key for scroll II. Scroll II tells you how to read scroll III. "
            "Submit the place where the Celestial Diamond is hidden."
        ),
        "payload": {
            "intro": [
                _line(HANDLER, "This is it, recruit. Three scrolls, three layers."),
                _line(HANDLER, "The first one looks like nonsense. Letters, digits, maybe an = at the end. That's not a cipher, it's an encoding."),
                _line("you", "Base64 first, then whatever's underneath."),
                _line(HANDLER, "Exactly. Use everything you've learned. The guards change in seven minutes. Go!"),
            ],
            "concept": {
                "title": "Layered ciphers",
                "body": (
                    "Real systems stack transformations. Encoding (Base64) is not encryption: anyone can "
                    "reverse it without a key. Peel the layers in order. Decode, then identify the cipher, "
                    "then use what each layer reveals to unlock the next. The terminal supports pipes, "
                    "e.g. `cat scroll_1.txt | base64 -d | caesar-bruteforce`."
                ),
            },
            "files": {
                "scroll_1.txt": b64encode(caesar_encrypt(L5_FRAG1_PLAIN, L5_SHIFT)),
                "scroll_2.txt": vigenere_encrypt(L5_FRAG2_PLAIN, L5_KEY),
                "scroll_3.txt": affine_encrypt(L5_FRAG3_PLAIN, L5_A, L5_B),
            },
            "tools": ["base64 -d $SCROLL_1", "caesar-bruteforce <text>", "vigenere-decrypt <key> $SCROLL_2", "affine-decrypt <a> <b> $SCROLL_3"],
            "outro": "THE CLOCK TOWER. You get there just ahead of the Black Paw. The Celestial Diamond is safe. Welcome to the CipherCats, agent.",
        },
        "solution": "CLOCK TOWER|THE CLOCK TOWER|INSIDE THE CLOCK TOWER",
        "hints": [
            "Run `cat scroll_1.txt | base64 -d | caesar-bruteforce` and find the readable line. It gives you a key.",
            "Scroll I says the Vigenère key is WHISKERS. Run `vigenere-decrypt WHISKERS $SCROLL_2`.",
            "Scroll II says a = 7 and b = 10. Run `affine-decrypt 7 10 $SCROLL_3`.",
        ],
    },
]

CODEBREAKER_QUEST = {
    "slug": "codebreaker-quest",
    "title": "Codebreaker Quest",
    "theme": "Classical Cryptography",
    "vibe": "Spy infiltration: parchment maps, secret scrolls and wartime codes.",
    "description": (
        "The Black Paw syndicate is hunting the Celestial Diamond. Follow their encrypted trail "
        "through Caesar, Vigenère, affine and frequency analysis, then beat them to the vault."
    ),
    "difficulty": "easy",
    "available": True,
    "reward": "1,000 XP + Codebreaker badge",
    "order_index": 1,
    "labs": LABS,
}
