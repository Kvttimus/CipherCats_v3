"""Puzzles of the Past: a tour through 2,000 years of secret writing.

Story: the Paradox Cat is stealing famous decryptions out of history. Without
them, cryptography never evolves. You travel with the CipherCats' Archive
Division to crack each one again and put the timeline back together.
"""

import random

from app.crypto import caesar_encrypt, vigenere_encrypt
from app.historical import enigma, group5, navajo_encode, otp_encrypt, rsa_encrypt_letters

ARCHIVIST = "Archivist Tabby"

# --- Lab 1: Caesar (Rome, 44 BC) ----------------------------------------------------
P1_SHIFT = 3  # Suetonius: Caesar wrote D for A
P1_PLAIN = (
    "BEWARE THE IDES OF MARCH. THE SENATORS WILL STRIKE AT THE THEATRE OF POMPEY. "
    "THEIR LEADER IS BRUTUS."
)

# --- Lab 2: Enigma (Bletchley Park, 1941) -------------------------------------------
P2_ROTORS = ["I", "II", "III"]
P2_START = "QWE"  # a lazy operator's keyboard-row "cilly"
P2_PLAIN = "WEATHERXREPORTXHEAVYXFOGXUBOATXWOLFPACKXGATHERSXNEARXICELANDXSTOP"

# --- Lab 3: Navajo code talkers (Iwo Jima, 1945) ------------------------------------
P3_PLAIN = "FIGHTER COVER REQUESTED. FLAG RAISED ON SURIBACHI"

# --- Lab 4: One-time pad reuse (VENONA, 1940s) --------------------------------------
P4_HEADER = "TOP SECRET MOSCOW CENTRE FROM WASHINGTON STATION"
P4_PLAIN_A = P4_HEADER + " THE PACKAGE ARRIVES FRIDAY"
P4_PLAIN_B = "URGENT THE MOLES CODENAME IS NIGHTINGALE DO NOT CONTACT HIM DIRECTLY STOP XXX"
P4_PAD = "".join(random.Random(1943).choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ") for _ in range(80))

# --- Lab 5: Hybrid encryption with textbook RSA (1977 → today) ----------------------
P5_P, P5_Q, P5_E = 61, 53, 17
P5_N = P5_P * P5_Q  # 3233
P5_D = pow(P5_E, -1, (P5_P - 1) * (P5_Q - 1))  # 2753
P5_SESSION_KEY = "TURING"
P5_PLAIN = (
    "CONGRATULATIONS TIME TRAVELLER. FROM CAESAR TO RSA EVERY CIPHER FELL TO A CLEVER MIND. "
    "THE TIMELINE IS RESTORED AND THE FINAL WORD IS PERSEVERANCE."
)


def _line(speaker: str, text: str) -> dict:
    return {"speaker": speaker, "text": text}


LABS = [
    {
        "slug": "caesars-scroll",
        "title": "Caesar's Scroll",
        "cipher_type": "caesar",
        "description": "Read a warning from ancient Rome, written in Caesar's own cipher.",
        "skills": ["Historical Cryptography", "Classical Ciphers"],
        "xp_reward": 100,
        "story_segment": (
            "Rome, 15 March 44 BC. A slave hurries through the Forum with a scroll for Julius Caesar. "
            "In our timeline Caesar never read it. The Paradox Cat has now erased the scroll from the "
            "archives altogether. Decrypt it so history remembers the warning, and the name inside."
        ),
        "challenge_prompt": (
            "The historian Suetonius tells us which shift Caesar used. Decrypt the scroll and submit "
            "the name of the conspirators' leader."
        ),
        "payload": {
            "intro": [
                _line(ARCHIVIST, "Welcome to the Archive Division, recruit. I'm Tabby, and I look after history's secrets."),
                _line(ARCHIVIST, "Someone calling themselves the Paradox Cat is stealing famous decryptions out of the timeline."),
                _line("you", "Stealing them? Why?"),
                _line(ARCHIVIST, "If nobody ever cracks these messages, nobody learns from them, and cryptography never evolves. We're going to crack them all again, in order."),
                _line(ARCHIVIST, "First stop is Rome. Julius Caesar had his own cipher, and we know his key because a historian wrote it down."),
            ],
            "concept": {
                "title": "The original Caesar cipher",
                "body": (
                    "Around AD 120, Suetonius wrote that Caesar \"substituted the fourth letter of the "
                    "alphabet, namely D, for A, and so with the others\", which is a shift of 3. Caesar's "
                    "security came from his enemies not knowing the method at all. Today we assume the "
                    "attacker knows the algorithm (Kerckhoffs's principle), and with only 25 keys, that "
                    "makes a Caesar cipher trivial to break."
                ),
            },
            "files": {"scroll.txt": caesar_encrypt(P1_PLAIN, P1_SHIFT)},
            "given": {"Historian": "Suetonius, Life of Julius Caesar §56"},
            "tools": ["cat scroll.txt", "caesar-decrypt 3 $SCROLL", "caesar-bruteforce $SCROLL"],
            "outro": "BRUTUS. The scroll is back in the archive. Next stop: 1941, and a machine with 158 quintillion settings.",
        },
        "solution": "BRUTUS|MARCUS BRUTUS|MARCUS JUNIUS BRUTUS",
        "hints": [
            "\"D for A\" means each letter moved 3 places forward. To decrypt, shift back by 3.",
            "Run `caesar-decrypt 3 $SCROLL`.",
            "The last sentence names the leader: BRUTUS.",
        ],
    },
    {
        "slug": "enigma-enigma",
        "title": "Enigma Enigma",
        "cipher_type": "enigma",
        "description": "Break an Enigma message by exploiting a lazy operator's key choice.",
        "skills": ["Historical Cryptography", "Machine Ciphers", "Cryptanalysis"],
        "xp_reward": 150,
        "story_segment": (
            "Bletchley Park, 1941. Hut 8 has intercepted a U-boat weather report. A captured codebook "
            "gave you the rotor order, but not today's start position. The Paradox Cat wants this "
            "message to stay unread. Luckily, this operator is known for picking lazy settings."
        ),
        "challenge_prompt": (
            "Find the operator's start position, decrypt the intercept with the `enigma` command, and "
            "submit the place where the U-boat wolfpack is gathering."
        ),
        "payload": {
            "intro": [
                _line(ARCHIVIST, "Enigma: three spinning rotors, a reflector, and a new substitution alphabet for every single keypress."),
                _line("you", "Then how did anyone break it?"),
                _line(ARCHIVIST, "Mathematics, the Bombe machines, and people. Operators were tired and lazy. They picked start positions like AAA, or letters next to each other on the keyboard."),
                _line(ARCHIVIST, "Bletchley Park called those \"cillies\". Guess this operator's cilly and the machine does the rest."),
            ],
            "concept": {
                "title": "Rotor machines & human error",
                "body": (
                    "Each keypress steps the right rotor; at its notch it carries the middle rotor along, "
                    "like an odometer. Electricity passes through the three rotors, bounces off the "
                    "reflector and comes back through them, so encryption is its own inverse: type the "
                    "ciphertext with the same settings and out comes the plaintext. The reflector also "
                    "means a letter can never encrypt to itself. Polish and British cryptanalysts "
                    "exploited this, along with predictable \"cribs\" such as WETTER (weather) and lazy "
                    "operator keys."
                ),
            },
            "files": {"intercept.txt": group5(enigma(P2_PLAIN, P2_ROTORS, P2_START))},
            "given": {"Rotors (left→right)": "I-II-III", "Reflector": "B", "Ring settings": "AAA", "Start position": "unknown (lazy operator)"},
            "tools": ["enigma I-II-III AAA $INTERCEPT", "enigma I-II-III <start> $INTERCEPT"],
            "outro": "ICELAND. The convoys are rerouted around the wolfpack. Next stop: the Pacific, 1945, and a code that was never broken.",
        },
        "solution": "ICELAND|NEAR ICELAND",
        "hints": [
            "Try the laziest settings first: `enigma I-II-III AAA $INTERCEPT`, then ABC, then XYZ… Readable output means you've found it.",
            "Look at the top-left row of a keyboard. Operators often just typed three keys next to each other.",
            "The start position is QWE. Run `enigma I-II-III QWE $INTERCEPT`. The X characters separate words.",
        ],
    },
    {
        "slug": "navajo-net",
        "title": "The Navajo Net",
        "cipher_type": "code",
        "description": "Decode a WW2 transmission sent by Navajo code talkers.",
        "skills": ["Historical Cryptography", "Codes & Codebooks"],
        "xp_reward": 100,
        "story_segment": (
            "Iwo Jima, February 1945. Navajo code talkers sent battlefield messages that the enemy "
            "never managed to break. The Paradox Cat has scrambled the archive copy of one famous "
            "transmission. Use the codebook to rebuild the sentence word by word."
        ),
        "challenge_prompt": (
            "Translate the transmission with the codebook (each code word is one letter, or a whole "
            "military term). Submit the name of the mountain where the flag was raised."
        ),
        "payload": {
            "intro": [
                _line(ARCHIVIST, "This one isn't a cipher at all. It's a code."),
                _line("you", "What's the difference?"),
                _line(ARCHIVIST, "A cipher scrambles letters with an algorithm and a key. A code replaces whole words or ideas using a codebook."),
                _line(ARCHIVIST, "The Navajo code talkers built theirs on top of the Navajo language, which was unwritten and almost unknown outside the Navajo Nation. It was never broken."),
            ],
            "concept": {
                "title": "Codes vs ciphers: the Navajo code talkers",
                "body": (
                    "Starting in 1942, around 400 Navajo Marines served as code talkers. They used about "
                    "200 (later over 600) code terms. Military words became Navajo words: a submarine was "
                    "BESH-LO (\"iron fish\") and a fighter plane was DA-HE-TIH-HI (\"hummingbird\"). Other "
                    "words were spelled out using a Navajo word for each letter, such as WOL-LA-CHEE (ant) "
                    "for A. They could encode, transmit and decode a message in seconds, far faster than "
                    "cipher machines. This lab uses a simplified one-word-per-letter alphabet. The real "
                    "code had several words for common letters, to defeat frequency analysis."
                ),
            },
            "files": {"transmission.txt": navajo_encode(P3_PLAIN)},
            "tools": ["codebook", "codebook <code word>", "cat transmission.txt | codebook"],
            "outro": "SURIBACHI. The flag raising on Mount Suribachi was reported by the code talkers. Next stop: the Cold War, and a cipher that's mathematically unbreakable, unless someone cuts corners.",
        },
        "solution": "SURIBACHI|MOUNT SURIBACHI|MT SURIBACHI",
        "hints": [
            "Run `codebook` to see the alphabet. Each code word is one letter, and `/` separates words.",
            "You can translate the whole file at once: `cat transmission.txt | codebook`.",
            "The last word is spelled DIBEH NO-DA-IH GAH TKIN SHUSH WOL-LA-CHEE MOASI LIN TKIN, which is SURIBACHI.",
        ],
    },
    {
        "slug": "cold-war-crack",
        "title": "Cold War Crack",
        "cipher_type": "otp",
        "description": "Break a one-time pad that was used twice.",
        "skills": ["Historical Cryptography", "Cryptanalysis", "Symmetric Cryptography"],
        "xp_reward": 200,
        "story_segment": (
            "Arlington Hall, 1946. Two Soviet cables were encrypted with a one-time pad, which should be "
            "impossible to break. But wartime shortages meant pad pages were sometimes reused. Both "
            "cables were sent with the same page. The Paradox Cat wants the VENONA project never to "
            "find this."
        ),
        "challenge_prompt": (
            "Cable A begins with the standard header. Use it to recover part of the pad, decrypt the "
            "start of cable B with it, and submit the mole's codename."
        ),
        "payload": {
            "intro": [
                _line(ARCHIVIST, "A one-time pad is the only cipher that's mathematically proven unbreakable."),
                _line("you", "So we're stuck?"),
                _line(ARCHIVIST, "Only if it's used correctly: a truly random key, as long as the message, used exactly once. These two cables share one key."),
                _line(ARCHIVIST, "And every cable from this station starts with the same header. Know the plaintext and you know the key at those positions."),
            ],
            "concept": {
                "title": "One-time pads & key reuse",
                "body": (
                    "With letters as numbers, c = p + k (mod 26), where the key k is random and as long "
                    "as the message. Every plaintext is equally likely, so the ciphertext reveals nothing. "
                    "Reuse breaks that. If you know any plaintext p, then k = c − p (mod 26) at those "
                    "positions, and the same k decrypts the second message. The real VENONA project used "
                    "pad reuse to read thousands of Soviet cables and expose spies."
                ),
            },
            "files": {
                "cable_a.txt": group5(otp_encrypt(P4_PLAIN_A, P4_PAD)),
                "cable_b.txt": group5(otp_encrypt(P4_PLAIN_B, P4_PAD)),
            },
            "given": {"Standard header (cable A)": P4_HEADER},
            "tools": ['otp-key "<known plaintext>" $CABLE_A', "otp-decrypt <key> $CABLE_B"],
            "outro": "NIGHTINGALE. The mole is exposed. One last stop: 1977, when three researchers changed secrecy forever.",
        },
        "solution": "NIGHTINGALE",
        "hints": [
            'Recover the pad from the header: `otp-key "TOP SECRET MOSCOW CENTRE FROM WASHINGTON STATION" $CABLE_A`.',
            "Feed that key into cable B: `otp-decrypt <key from step 1> $CABLE_B`. Positions the key doesn't cover show as ?.",
            "Cable B starts with URGENT THE MOLES CODENAME IS NIGHTINGALE.",
        ],
    },
    {
        "slug": "digital-age-decryption",
        "title": "Digital Age Decryption",
        "cipher_type": "rsa",
        "description": "Boss lab: break small RSA to recover a session key, then decrypt the final message.",
        "skills": ["Historical Cryptography", "Asymmetric Cryptography", "Symmetric Cryptography", "Modular Arithmetic"],
        "xp_reward": 250,
        "is_boss": True,
        "story_segment": (
            "1977: Rivest, Shamir and Adleman publish RSA, and anyone can now encrypt to you without "
            "ever sharing a secret. The Paradox Cat's final message uses hybrid encryption, just like "
            "the web does today. The session key is locked with RSA, but the RSA key is far too small."
        ),
        "challenge_prompt": (
            "Factor n, compute the private key d, RSA-decrypt the session key, then use it to decrypt "
            "the message (Vigenère). Submit the final word."
        ),
        "payload": {
            "intro": [
                _line(ARCHIVIST, "Every cipher we've seen so far had the same weakness: both sides needed to share a secret key first."),
                _line(ARCHIVIST, "Public-key cryptography fixed that. Anyone can lock a message with your public key, and only your private key opens it."),
                _line("you", "And this one is breakable because…?"),
                _line(ARCHIVIST, "Its n is tiny. Factor n and you can rebuild the private key. Then it's 2,000 years of cryptography in one lab. Go restore the timeline!"),
            ],
            "concept": {
                "title": "RSA & hybrid encryption",
                "body": (
                    "Pick primes p, q. Public key: n = p·q and e. Private key: d = e⁻¹ mod φ(n), where "
                    "φ(n) = (p−1)(q−1). Encrypt c = mᵉ mod n; decrypt m = cᵈ mod n. Security rests on "
                    "factoring n being hard, and real keys are 2048+ bits. Because RSA is slow, real systems "
                    "(TLS, PGP) use it only to send a short random session key, and encrypt the actual "
                    "data with a fast symmetric cipher. That's hybrid encryption. Here each letter of the "
                    "session key (A=1 … Z=26) was encrypted separately."
                ),
            },
            "files": {
                "public_key.txt": f"n = {P5_N}\ne = {P5_E}",
                "session_key.txt": " ".join(str(c) for c in rsa_encrypt_letters(P5_SESSION_KEY, P5_E, P5_N)),
                "message.txt": vigenere_encrypt(P5_PLAIN, P5_SESSION_KEY),
            },
            "tools": [
                "factor 3233",
                "calc (53-1)*(61-1)",
                "modinv 17 <phi>",
                "rsa-decrypt <d> 3233 $SESSION_KEY",
                "vigenere-decrypt <key> $MESSAGE",
            ],
            "outro": "PERSEVERANCE. From Caesar to RSA, every cipher has fallen to a clever mind. The timeline is restored, Agent. The Archive Division salutes you.",
        },
        "solution": "PERSEVERANCE",
        "hints": [
            "`factor 3233` gives 53 × 61. Then φ(n) = 52 × 60 = 3120 (`calc (53-1)*(61-1)`).",
            "d = `modinv 17 3120` = 2753. Run `rsa-decrypt 2753 3233 $SESSION_KEY` to get the session key.",
            "The session key is TURING. Run `vigenere-decrypt TURING $MESSAGE`.",
        ],
    },
]

PUZZLES_OF_THE_PAST = {
    "slug": "puzzles-of-the-past",
    "title": "Puzzles of the Past",
    "theme": "Historical Timeline",
    "vibe": "Crack codes from Rome to the Cold War, and restore the timeline.",
    "description": (
        "The Paradox Cat is erasing history's great decryptions. Travel from Caesar's Rome to "
        "Bletchley Park, the Pacific, the Cold War and the birth of RSA to crack them all again."
    ),
    "difficulty": "easy",
    "available": True,
    "reward": "800 XP + Historian badge",
    "order_index": 2,
    "labs": LABS,
}
