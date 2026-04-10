# PM2 Selfhosted Runbook

Stand: 2026-04-10

This runbook documents the tracked PM2 ecosystem for the selfhosted core
profile.

## Scope

Tracked PM2 apps in `pm2/ecosystem.config.cjs`:

- `godmode-core-tools-bridge`
- `godmode-frontend-preview`

## Prerequisites

- Node.js with global `pm2`
- Python in `PATH` for `core_tools_bridge.py`
- `npm install` already done in `CoronaProjektschonwieder`

## Start

```bash
cd d:/Web/docs/godmode_setup
pm2 start pm2/ecosystem.config.cjs
```

## Verify

```bash
pm2 list
curl -fsS http://127.0.0.1:3911/health
curl -fsS http://127.0.0.1:4173
```

## Restart / Stop

```bash
pm2 restart pm2/ecosystem.config.cjs
pm2 stop pm2/ecosystem.config.cjs
pm2 delete pm2/ecosystem.config.cjs
```

## Notes

- This PM2 profile supervises host-side tooling only.
- Dockerized core services (`OpenHands`, `n8n`, `LangGraph`, `LiteLLM`) still
  run through Compose in `START_GODMODE.ps1` and `START_GODMODE.sh`.
