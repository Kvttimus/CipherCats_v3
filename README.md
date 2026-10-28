# CipherCats 🐱‍👤

A gamified web platform that teaches cryptography through story-driven, interactive labs.
Players pick a storyline, crack ciphers in an in-browser terminal, and earn XP and badges as their skills level up.

**MVP storyline: Codebreaker Quest** (classical cryptography, 5 labs)

| # | Lab | Technique |
|---|-----|-----------|
| 1 | The Forgotten Shift | Caesar cipher, brute force, alphabet wrapping |
| 2 | Twin V's Secret | Vigenère with known key length, column frequency analysis |
| 3 | Modular Minds | Affine cipher, known-plaintext crib, modular inverses |
| 4 | The Frequency Trap | Identify an unknown cipher with frequency analysis + IC |
| 5 | The Great Decryption | Boss: Base64 → Caesar → Vigenère → Affine chain |

**Puzzles of the Past** (historical timeline, 5 labs)

| # | Lab | Technique |
|---|-----|-----------|
| 1 | Caesar's Scroll | Caesar's historical shift of 3, Kerckhoffs's principle |
| 2 | Enigma Enigma | Enigma I simulator, lazy operator keys ("cillies") |
| 3 | The Navajo Net | Codes vs ciphers: the Navajo code talkers' codebook |
| 4 | Cold War Crack | One-time pad key reuse (VENONA), known-plaintext key recovery |
| 5 | Digital Age Decryption | Boss: factor small RSA → session key → decrypt (hybrid encryption) |

Four more storylines from the proposal appear in the menu as "coming soon".

## Architecture

```
React + Vite (Vercel)  ──JWT──▶  Flask API (Render)  ──service role──▶  Supabase Postgres
        │                              │
        └── Supabase Auth only         └──token──▶  Sandbox (Replit / Docker)
```

The frontend **never** talks to the database. It signs in with Supabase Auth and sends the
access token to Flask, which verifies it with Supabase and does all reads and writes.
Solutions and hints live in `lab_solutions`, which RLS blocks completely, and answers are checked server-side.

```
frontend/   React 19, TypeScript, Tailwind v4, shadcn/ui, React Router, TanStack Query, xterm.js
backend/    Flask, flask-limiter, supabase-py · content/ = lab definitions · tests/
sandbox/    isolated Python runner for code snippets (Replit or Docker)
supabase/   schema.sql, policies.sql, seed.sql (generated)
render.yaml Render blueprint for the API
```

## Features

- **Login / signup / guest play.** Guests can later upgrade to a full account without losing progress.
- **Avatar selection** (four cat agents) and a game-style **home launcher**: Play → Continue / New story, Settings, Dashboard, Menu.
- **Storyline menu** with difficulty, briefing and reward, plus a **storyline map** where labs unlock in order within each storyline
  (set `SEQUENTIAL_UNLOCK = False` in `backend/app/progress.py` to open them all). Storylines never
  lock each other: any available one can be started at any time.
- **Lab interface:** an objective slide (dialogue between the handler cat and the player's avatar), then story, concept intel,
  challenge files, an answer box, progressive **hints** (−15% XP each) and **reveal solution** (0 XP).
- **Pop-up terminal** (Ctrl + `) with simulated tools: `caesar-*`, `vigenere-*`, `affine-*`, `freq`, `ic`,
  `columns`, `modinv`, `base64`, `openssl base64`, `python -c`, `submit`… It supports pipes (`cat f | base64 -d | caesar-bruteforce`),
  `$FILE` variables, history and tab completion. A **Python sandbox** tab runs code remotely.
- **Dashboard:** Overview (XP bar, skills, badges, achievements), Stats (attempts, mistakes, accuracy, times),
  Badges (11), Storylines, and Completed Labs.
- **Security:** server-side answer checking, atomic XP awards, rate limiting, input validation,
  locked-down RLS, and security headers. User code never runs in the API process.
- Synthesized sound effects and ambient music toggle (no audio assets).

## Local development

### 1. Supabase
1. Create a project at supabase.com. Enable **Anonymous sign-ins** (Auth → Providers) for guest play.
2. In the SQL editor run, in order: `supabase/schema.sql`, `supabase/policies.sql`, `supabase/seed.sql`.
   All three are idempotent. Re-run them to upgrade an existing database.

### 2. Backend (Flask), port 5000
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env    # fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
python wsgi.py
pytest                  # 34 tests: content solvability, game rules, API flow
```

### 3. Frontend (Vite), port 5173
```bash
cd frontend
pnpm install
cp .env.example .env    # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
pnpm dev                # /api is proxied to localhost:5000
pnpm test && pnpm lint
```

### 4. Sandbox (optional)
Enables `python -c` and the Python tab. See [sandbox/README.md](sandbox/README.md).
Locally: `cd sandbox && pip install -r requirements.txt && SANDBOX_TOKEN=dev python runner.py`, then set
`SANDBOX_URL=http://localhost:8080` and `SANDBOX_TOKEN=dev` in `backend/.env`.

## Editing lab content
Labs are defined in Python in `backend/content/`, so ciphertexts are *generated* from the plaintext + key
and tests prove every lab is solvable with the techniques its hints describe. After editing:
```bash
cd backend && python -m scripts.gen_seed   # rewrites supabase/seed.sql
pytest
```
Then re-run `seed.sql` in Supabase.

## Deployment
- **Frontend → Vercel:** import the repo and set **Root Directory = `frontend`** (Vite preset).
  Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL=https://<api>.onrender.com`.
  `vercel.json` handles SPA routing.
- **Backend → Render:** New → Blueprint → this repo (uses `render.yaml`). Set `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGINS=https://<app>.vercel.app`, and optionally `SANDBOX_URL` / `SANDBOX_TOKEN`.
- **Sandbox → Replit or Docker:** see `sandbox/README.md`.
- In Supabase → Auth → URL configuration, set the Site URL to the Vercel deployment URL.
