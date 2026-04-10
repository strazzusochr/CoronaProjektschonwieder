# Deep Wiring Report 2026-04-10

Stand: 2026-04-10

This report captures a deep wiring pass across `godmode_setup` with focus on
closing runtime gaps that were previously marked `PARTIAL`, `UNKNOWN`, or
`NOT VERIFIED`.

## Completed Wiring Upgrades

### 1) DevTools / Playwright endpoints

Implemented:

- `core_tools_bridge.py` with:
  - `GET /health`
  - `POST /run_playwright`
  - `POST /run_devtools`
  - `POST /snapshot_devtools`
- OpenHands adapter forwarding in `openhands/adapter.py`:
  - `POST /run_playwright`
  - `POST /run_devtools`
  - `POST /snapshot_devtools`

Compose/runtime wiring:

- `openhands/docker-compose.yml` now passes:
  - `DEVTOOLS_BRIDGE_URL`
  - `DEVTOOLS_BRIDGE_TIMEOUT`
- host bridge access via `host.docker.internal` is explicitly wired for the
  adapter container.

Validation:

- bridge direct endpoint run:
  - `HEALTH=healthy`
  - `SNAPSHOT=ok`
  - `PLAYWRIGHT=ok`
  - `DEVTOOLS=ok`
- adapter forwarding run (with bridge on port `3911`):
  - `ADAPTER_SNAPSHOT=forwarded`
  - `ADAPTER_PLAYWRIGHT=forwarded`
  - `ADAPTER_PLAYWRIGHT_RESULT=ok`

### 2) LiteLLM runtime path

Implemented:

- `litellm/docker-compose.yml` added.
- startup scripts now start LiteLLM and health-check it:
  - `START_GODMODE.ps1`
  - `START_GODMODE.sh`

Validation:

- container status reached `healthy`
- HTTP check on `http://127.0.0.1:4000/` returned `200`

### 3) PM2 ecosystem

Implemented:

- `pm2/ecosystem.config.cjs`
- `PM2_SELFHOSTED_RUNBOOK.md`

This closes the previous repo-level gap where no tracked PM2 ecosystem file
existed.

### 4) Environment and docs wiring

Updated:

- `.godmode_env.example` with bridge and LiteLLM runtime fields
- `ENV_REFERENCE.md`
- `STACK_OPERATIONS.md`
- `STACK_GAP_ROADMAP.md`
- `SUPERPOWERS_STATUS.md`

Default bridge port is now `3911` to avoid the observed local collision on
`3900`.

## Regression Validation

Frontend:

- `npm test` passed
- `npm run build` passed
- `npm run test:browser` passed

Compose syntax:

- `openhands/docker-compose.yml` valid
- `langgraph/docker-compose.yml` valid
- `n8n/docker-compose.yml` valid
- `litellm/docker-compose.yml` valid

Launcher syntax:

- `START_GODMODE.ps1` parse check: `PS1_PARSE_OK`
- `START_GODMODE.sh` syntax check in Docker bash: `BASH_PARSE_OK`

## Status Class Promotions

Promoted to functional in repo/runtime:

- `run_devtools` / `run_playwright` / `snapshot_devtools`:
  `NOT VERIFIED` -> `VERIFIED` (local runtime + adapter forwarding path)
- `PM2 ecosystem`:
  `UNKNOWN` -> `IMPLEMENTED` (tracked config + runbook)
- `LiteLLM runtime path`:
  config-only -> runtime-wired and locally verified at endpoint level

## Remaining Non-Repo / External Constraints

These cannot be forced to `100%` from this repository alone:

- `bolt.diy` hosted runtime ownership and live loop proof
- any claimed `godmode-pilot-v2` target that is not present in current public
  space discovery
- guide-only claims beyond the implemented local LangGraph and hosted facade

They remain external operator dependencies, not local wiring defects.
