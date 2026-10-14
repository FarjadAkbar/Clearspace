# Clearspace Node API (active backend)

Node.js 24+, Fastify and MongoDB Atlas. No Python, SQLite, Redis or locally installed MongoDB is required. The extension's endpoints remain unchanged. This source has not been deployed to your domain.

## Deploy without Docker
1. Create an Atlas cluster and a database user with readWrite access to ONLY the clearspace database. Do not use an Atlas administrator account as the application credential.
2. Add only your server's outbound IP to Atlas Network Access. Do not allow 0.0.0.0/0. Managed hosting with changing egress IPs needs a provider with static egress/private networking or a VPS; broad IP access is not the workaround.
3. Choose Connect → Drivers → Node.js and copy the mongodb+srv URI into server-side MONGODB_URI. Percent-encode special password characters. Atlas manages the database; you still need cluster credentials/network configuration.
4. Upload node-api/ excluding node_modules/, tests/ and .env. Include src/, package.json, package-lock.json and .env.example.
5. Install Node 24, then run npm ci --omit=dev --ignore-scripts in node-api/.
6. cp .env.example .env and chmod 600 .env. Set MONGODB_URI, HIVE_API_KEY, CORS_ORIGINS to your published extension ID, and RATE_LIMIT_SECRET (generate with node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"). Use HIVE_ENDPOINT for your account's region.
7. For the current no-login extension explicitly set PUBLIC_ACCESS=true and use a conservative GLOBAL_AI_DAILY_LIMIT. Private mode requires issued Bearer tokens whose SHA-256 hashes are in ACCESS_TOKEN_HASHES. NEVER embed a shared API token or the Hive key in a public extension. Account login/billing are not implemented here.
8. npm start for a smoke test; use your hosting panel/process supervisor/systemd for production restarts. Node's --env-file-if-exists loads .env; a panel running src/server.js directly must supply environment variables itself.
9. Route clearspace.decentgatewaysllc.com to the API using HTTPS and nginx.conf.example, or your hosting provider's HTTPS routing. Keep HOST=127.0.0.1 behind host nginx. A platform routing directly to a container may require HOST=0.0.0.0, its assigned PORT, and its documented proxy settings.
10. Set TRUST_PROXY only to the exact nginx/provider proxy addresses. nginx must overwrite X-Forwarded-For. Never set a wildcard or trust arbitrary forwarded headers. The default local setup uses loopback; Docker requires the actual host bridge IP.
11. Check https://clearspace.decentgatewaysllc.com/health, then test résumé uploads, a job comparison and thought organization before switching users.

## Optional Docker
Docker is optional. cp .env.example .env, configure it, then docker compose up -d --build. There is only one API container and no local database service/volume. Atlas owns rate-limit storage. nginx can keep its existing loopback upstream on port 8000. HOST is overridden to 0.0.0.0 in compose; set TRUST_PROXY to the actual gateway address shown by docker inspect, not '*'.

## Endpoints
GET /health (process health, not an ongoing Atlas connectivity check)
POST /api/clearspace/organize: JSON {transcript,date}
POST /api/clearspace/job-match: JSON {cv,job,candidateName?}
POST /api/clearspace/resume-extract: multipart file, PDF/DOCX/TXT, at most 5 MB

## Security and limits
Hive/MongoDB credentials stay on the server. Logs and HTTP errors do not expose provider bodies, tokens, request documents or connection strings. CORS is not authentication. Quotas: 60 requests/minute, 10 uploads/hour, 10 AI calls/hour, 25/day per identity, plus a shared configurable daily cap (default 50). MongoDB errors fail closed. Provider calls have a 45-second timeout, no redirects and no automatic retries. Atlas stores hashed quota identifiers and expiring owner-checked leases only; it does not store CVs, uploads or results. Atomic Mongo updates enforce expiry even before TTL deletion runs. Initial Mongo quota history starts fresh when migrating from SQLite: use a conservative cap at cutover.

Rate limits mitigate public-demo abuse; distributed IPs can evade per-IP limits. Set provider spending alerts/caps and add account authentication/entitlements before selling paid access. Atlas pricing/availability depends on its current plan; this project does not assume an unlimited free database. Restrict Atlas access, rotate credentials, preserve the RATE_LIMIT_SECRET and regularly review dependency advisories. Protect .env in backups.

## Privacy and parsing
Server redaction uses declared candidate names, header detection, an English-focused name recognizer (compromise), email/phone/URL patterns. It is best-effort, not guaranteed anonymization, especially for Urdu or unusual layouts. Always review the redacted upload preview. A supplied candidateName improves explicit redaction for pasted CVs. Names/contact details are removed before both AI features, including job descriptions and brain dumps. Names mentioned as meaningful content may also be redacted.

Parsers run in a separate Node process with a 10-second kill timeout and a 128 MB V8 heap cap. Server secrets are not inherited by the parser child environment. DOCX expanded-size/member limits reject macros and external references; PDF is limited to 20 text-based pages. Legacy DOC and scanned PDF OCR are not supported. The parser does not execute document scripts or fetch user-provided URLs. A V8 heap limit is not a complete native-memory/security sandbox; retain container/process memory/CPU limits and an unprivileged service account. Uploads are held in bounded memory, not saved to disk/Atlas.

## Testing
npm ci --ignore-scripts
npm test
Tests mock Hive and the quota store; parser fixtures run through the real Node worker. Optional Atlas integration tests require TEST_MONGODB_URI and create/drop a randomly named clearspace_test_* database, so use a separate TEST account/cluster with permission to that test database family, not production credentials. Without that variable, Atlas integration is skipped. Live Atlas, TLS/proxy configuration, Hive and redaction accuracy require staging verification.

## Migration
Node is the active implementation; obsolete Python files have been removed. Deploy the Node backend at the SAME domain/path, verify it, then stop the old backend so only one serves the domain. Never run both with separate quota histories behind a load balancer. No extension change or new ZIP is required for this backend migration.
