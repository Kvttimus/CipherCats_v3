# CipherCats sandbox

Runs lab Python snippets (`python -c "..."` in the in-game terminal) in isolation.
The Flask API proxies to it at `POST /run`. Browsers never call it directly.

## Deploy on Replit
1. Create a Python Repl and import this folder (`runner.py`, `requirements.txt`, `.replit`).
2. Add a secret `SANDBOX_TOKEN` with a long random value.
3. Deploy it (Reserved VM or Autoscale) and copy the URL.
4. In the backend, set `SANDBOX_URL=<that url>` and the same `SANDBOX_TOKEN`.

## Deploy with Docker (stronger isolation)
```bash
docker build -t ciphercats-sandbox .
docker run -p 8080:8080 -e SANDBOX_TOKEN=change-me --read-only --tmpfs /tmp:size=16m \
  --memory=256m --cpus=0.5 --pids-limit=64 --cap-drop=ALL --security-opt no-new-privileges \
  ciphercats-sandbox
```

## Security notes
- Each run is a fresh `python -I -S` process with an empty environment and a temp working dir.
- On Linux it also gets a CPU-seconds limit, a 128 MB address-space limit, no child processes and a 1 MB file-size limit.
- The process sandbox is **not** a hard security boundary by itself. Always run it in its own
  container/Repl with no secrets in it. Replit containers have outbound network; Docker with
  `--network none` (behind a reverse proxy) is the strongest option.
