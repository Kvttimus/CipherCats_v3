"""Storylines from the proposal that aren't built yet. They appear in the menu
as "coming soon" with their planned labs, so the map shows the full arc."""

UPCOMING_STORYLINES = [
    {
        "slug": "block-cipher-path",
        "title": "Block Cipher Path",
        "theme": "Symmetric Cryptography",
        "vibe": "A sci-fi data heist through quantum vaults and glitching data grids.",
        "description": "Pad blocks, leak ECB penguins, walk a Feistel forest and survive the modes of AES.",
        "difficulty": "medium",
        "reward": "1,200 XP + Vaultbreaker badge",
        "order_index": 3,
        "preview": ["The Padding Problem", "Echoes of E", "The Feistel Forest", "Modes of Mayhem", "Vaultbreaker"],
    },
    {
        "slug": "steganography-saga",
        "title": "Steganography Saga",
        "theme": "Hidden Messages",
        "vibe": "A detective's corkboard of photos, red string and secrets hidden in plain sight.",
        "description": "Pull messages out of pixels, metadata, audio spectrograms and nested archives.",
        "difficulty": "medium",
        "reward": "1,200 XP + Ghost badge",
        "order_index": 4,
        "preview": ["Hidden in the Pixels", "Metadata Mayhem", "Noise Whisper", "Archive Inception", "Spy Satellite Sequence"],
    },
    {
        "slug": "rsa-exploitation-adventure",
        "title": "RSA Exploitation Adventure",
        "theme": "Asymmetric Cryptography",
        "vibe": "Dark-web aesthetics, secret agents and government backdoors.",
        "description": "Factor weak keys, loot low exponents, exploit shared moduli and query a padding oracle.",
        "difficulty": "hard",
        "reward": "1,500 XP + Exploiter badge",
        "order_index": 5,
        "preview": ["The Weak Key", "Low Exponent Loot", "Modulus Madness", "The Side Door", "Decrypt the Leak"],
    },
    {
        "slug": "protocol-pentester",
        "title": "Protocol Pentester",
        "theme": "Protocol Attacks",
        "vibe": "An internet mystery thriller: downgrades, MITM and broken chains of trust.",
        "description": "Force TLS downgrades, sniff credentials, break weak Diffie-Hellman and forge MD5 collisions.",
        "difficulty": "extreme",
        "reward": "2,000 XP + Pentester badge",
        "order_index": 6,
        "preview": ["The Downgrade Dilemma", "Man in the Shadow", "Diffie-Hellman Flaw", "Hash Clash", "The Broken Chain"],
    },
]
