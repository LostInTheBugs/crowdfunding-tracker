# Crowdfunding Tracker

Personal dashboard to track real estate crowdfunding investments (Bricks.co, La Première Brique, …).
Manual data entry **or xlsx import** (Operations page — Bricks.co / La Première Brique exports supported, auto-detected).

## Features

- Stake tracking, project delays (auto-computed vs expected end date), accrued/received interest
- Gains & losses, **unrealized losses** (invested vs current brick value)
- **Real annualized return per finished project** vs advertised rate (red if below, green if above)
- **Reinvested capital** (invested beyond deposits, per platform)
- **Overall performance** per platform vs total deposits: balance + invested value, gain %, annualized rate
- **Benchmark comparison**: S&P 500, Nasdaq, MSCI World, STOXX Europe 600, CAC 40, Livret A (editable annualized rates)
- Dashboard donuts: allocation by platform, late projects by platform, delay severity (critical/important/significant/negligible)
- **Discreet mode**: hide € amounts, show % shares only
- **Browser extension sync** (Chromium + Firefox): passive capture of Bricks.co / La Première Brique pages, sent to your tracker over your LAN
- **Backup / restore** (single JSON file)
- CSV export, i18n FR/EN

## Stack

- Backend: Python FastAPI + SQLite (stdlib, zero ORM)
- Frontend: vanilla JS + Chart.js (single HTML file)
- Deploy: Docker (Traefik-ready labels)

## Configuration

| Env var | Default | Description |
|---|---|---|
| `PORT` | `8016` | HTTP port (must match Dockerfile/uvicorn CMD) |
| `DOMAIN` | `your-domain.example.com` | Traefik Host rule |
| `ADMIN_USER` | `admin` | Login username |
| `ADMIN_PASSWORD` | `change-me` | Login password |
| `COOKIE_SECURE` | `0` | Set to `1` behind HTTPS |
| `DATA_DIR` | `./data` | SQLite data directory |

> ⚠️ **Security**: always override `ADMIN_USER` / `ADMIN_PASSWORD` with your own values (`.env` file, never commit it). The app is single-user: do not expose it to the public internet without a strong password and HTTPS (Traefik + Let's Encrypt labels provided).

## Run locally

```bash
uv venv && uv pip install -r requirements.txt
uv run uvicorn src.app:app --port 8016
# open http://localhost:8016
```

## Run with Docker

```bash
cp .env.example .env   # then edit ADMIN_USER / ADMIN_PASSWORD / DOMAIN
docker compose up -d --build
```

Private LAN deployment (no Traefik, no internet exposure):

```bash
docker compose -f docker-compose.lan.yml up -d --build
```

Data persists in `./data/app.db`.

## Browser extension

The extension captures data passively (fetch/XHR interception + DOM reads, no clicks on tabs or external links, no credentials — you stay logged in on the platforms). Captures are sent to your tracker only (`/api/scrape/ingest`, per-sync token shown in Settings).

Download it directly from the app: **Settings → Extension installation** (Chromium zip / Firefox zip).

- **Chrome / Edge / Brave**: unzip → `chrome://extensions` → Developer mode → *Load unpacked* → select the folder.
- **Firefox**: `about:debugging` → This Firefox → *Load Temporary Add-on* → select `manifest.json` (repeat after each Firefox restart).

Then set the tracker URL in the extension options (default `http://localhost:8016` — use your server's LAN IP if hosted elsewhere) and paste the sync token from the app's Settings page.

> The published extension defaults to `localhost`; if your tracker runs on another host, add its origin to `host_permissions` in `manifest.json` (and update the server URL in the extension options).

## Backup & restore

**Settings → Backup & restore**: download a full JSON backup (projects, operations, platform metadata, benchmarks). Restore replaces all current data — keep backups safe.

## Development

```bash
# tests / quick checks
python -m compileall src/
```

All commits and documentation are in English.
