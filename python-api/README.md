# Clearspace Python API

Deployable source for https://clearspace.decentgatewaysllc.com. Nothing here has been deployed to your domain. No live Hive calls are made during tests.

## Endpoints
- GET /health
- POST /api/clearspace/organize: JSON {transcript, date}
- POST /api/clearspace/job-match: JSON {cv, job, candidateName?}
- POST /api/clearspace/resume-extract: multipart file (PDF, DOCX, TXT, at most 5 MB). Returns redacted text for review; does not call DeepSeek.

The job-match response retains requirements/suggestions for the extension and adds a server-computed score and basis (exact/transferable/demonstrated/none). Required items weigh 2, preferred items 1. Met earns full credit, partial half, missing/unknown zero. Transferable evidence cannot receive full credit. This is a CV-to-job estimate, not an employer ATS result.

## Scoring behavior
Zustand can partially satisfy Redux-specific experience; it can fully satisfy a generic state-management requirement. Team leadership, mentoring or stakeholder coordination may evidence a concrete communication/collaboration duty; a title alone is not proof of every soft skill. Generic personality traits remain excluded. Month/year work ranges under an experience heading are merged, avoiding overlap. Year-only ranges are left uncertain rather than inventing months. Education/project dates are excluded. Duration does not prove time using a named technology.

## Privacy
The API removes detected PERSON names using spaCy, explicit candidateName matches, the first header line when appropriate, email, phone numbers and profile URLs before provider requests. It also redacts job text and brain dumps. Work date ranges are preserved. Automatic NER cannot guarantee removing all names, especially Urdu names or unusual document layouts. Uploaded CVs return a redacted preview; users must review it. Add the candidateName field when name/header detection is unclear. Do not promise full anonymization. There is no saved upload/history database; multipart parsing can temporarily spool files to the container's private RAM-backed /tmp and they are closed after processing.

## Deployment
1. Point DNS for clearspace.decentgatewaysllc.com at your server.
2. Copy this directory to the server; copy .env.example to .env.
3. Set HIVE_API_KEY only on the server. Generate RATE_LIMIT_SECRET: python -c "import secrets; print(secrets.token_urlsafe(48))". Never put either in the extension, source control, screenshots or group messages.
4. Set CORS_ORIGINS to your actual published chrome-extension:// ID. For development explicitly add only your localhost origin. CORS/extension IDs do not authenticate users.
5. Choose access mode: default requires a Bearer token whose SHA-256 hash is in ACCESS_TOKEN_HASHES. This is for server-to-server/private testing. Never embed a shared token into a public extension. For the current extension (no login), explicitly set PUBLIC_ACCESS=true for a capped public demo. Distributed abuse can bypass per-IP limits, so set a conservative GLOBAL_AI_DAILY_LIMIT and provider spending cap. For a paid service add account authentication, signed expiring access tokens and per-account entitlements; this scaffold does not implement billing/login.
6. docker compose up -d --build. spaCy's English name model is installed during build; startup fails if the model or Redis is missing. Redis is private and persistent. The Docker build uses requirements.lock with pinned dependency versions. Pin the base/container image digests for your deployment and regularly update dependencies.
7. Configure your existing TLS nginx virtual host with nginx.conf.example; obtain/install a valid TLS certificate. API binds only to host loopback. Set the trusted proxy address as described below.
8. Check /health and use a sample CV first. Verify quota, redaction and logging behavior before enabling public access.

## Proxy/IP limits
The Docker bridge changes the immediate peer address seen by uvicorn. Set FORWARDED_ALLOW_IPS in .env to the exact nginx/host bridge address reaching the API container; never use '*'. nginx must overwrite X-Forwarded-For with $remote_addr, as shown. Without correctly trusted proxy configuration all requests may share the proxy's IP quota. Do not expose container port 8000 directly.

Limits: 60 API requests/minute per identity, 10 uploads/hour, 10 AI calls/hour, 25 AI calls/day, global 200 AI calls/day (configurable). Rejected/repeated requests may consume quota intentionally. One provider call at a time per identity; no automatic provider retries. Redis failure blocks requests. Public mode is rate-limited, not authenticated. Concurrent requests share atomic Redis counters. Global daily count limits calls, not exact dollars; configure the provider's own budget alert/cap.

PDF: up to 20 pages, text-based only; encrypted/scanned PDFs are rejected. DOCX: ZIP expansion/member limits, macro/external-reference rejection. Legacy .doc or .docs is not supported: save as .docx or PDF. Parsing runs in a subprocess with a 10-second timeout and Linux CPU/address-space limits, plus container memory/PID limits. No user URLs are fetched and the provider endpoint is restricted to Hive's known hosts. HTTP errors, validation errors and logs do not expose document text, API keys or upstream response bodies. Request IDs are returned as X-Request-ID. Protect .env backups and monitor dependency advisories.

## Local tests
Python 3.12 recommended:
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m pytest tests -q

On Linux use .venv/bin/python. Real Redis, TLS, the deployed reverse proxy, Hive credentials and Urdu NER accuracy require staging verification. The test suite mocks provider/Redis/name entities; it does not establish production security or model accuracy.

For curl private testing use an environment variable for your own issued access token (never a provider key), then POST JSON or use -F file=@resume.pdf. Do not pass private documents in shell command history.
