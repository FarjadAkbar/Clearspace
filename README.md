# Clearspace

## Project layout
- `extension/` — Chrome extension files only (manifest, HTML, JavaScript, CSS, icons, fonts, sounds).
- `python-api/` — FastAPI backend, SQLite protection, deployment files and API tests.
- `tests/` — extension regression tests.
- `store-assets/` — store screenshots and optional packaging/screenshot scripts.
- `website/` — public support/privacy website.

## Load or publish the extension
In `chrome://extensions`, enable Developer mode → Load unpacked → select `extension/`.
For Chrome Web Store upload, ZIP the CONTENTS of `extension/`, so `manifest.json` sits at the archive root. Do not include Python API, tests, secrets, or website files.
Optional helper: `python store-assets/package_green.py`. It creates an extension-only archive; ZIPs are ignored by Git. No ZIP is kept in this project by default.

## Deploy the API
See `python-api/README.md`. SQLite is embedded; there is no separate database service. Keep its persistent volume across deployments. The public extension calls `https://clearspace.decentgatewaysllc.com/api/clearspace`.
Deploy and test the backend before publishing the extension. Provider credentials belong only in the API's `.env`/secret manager.

## Tests
From project root (PowerShell):
`$tests=Get-ChildItem tests/*.test.cjs | ForEach-Object FullName; node --test $tests`
From `python-api/`: `.venv/Scripts/python.exe -m pytest tests -q` (Linux: `.venv/bin/python`).

Rate limits and request leases persist in SQLite on one host/local filesystem. Multi-host replicas require a shared protection store. Uploaded résumés are not stored in SQLite. Recommendations are grounded in verified CV evidence; missing experience receives conditional advice rather than invented résumé claims.
