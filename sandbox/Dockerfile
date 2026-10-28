FROM python:3.12-slim

RUN useradd --create-home --uid 10001 sandbox
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY runner.py .

USER sandbox
ENV PORT=8080 PYTHONDONTWRITEBYTECODE=1
EXPOSE 8080
CMD ["sh", "-c", "gunicorn -w 2 -b 0.0.0.0:$PORT --timeout 30 runner:app"]

# Recommended run flags (no network for user code, read-only FS, caps):
#   docker run -p 8080:8080 -e SANDBOX_TOKEN=... --read-only --tmpfs /tmp:size=16m \
#     --memory=256m --cpus=0.5 --pids-limit=64 --cap-drop=ALL \
#     --security-opt no-new-privileges ciphercats-sandbox
