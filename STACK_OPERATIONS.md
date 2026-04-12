# GODMODE Stack Operations

Stand: 2026-04-11

Superbrain Merge 2026-04-12:
- Dispatch-Hub wurde auf namespaced Agent-Registry + 5 feste runtime targets erweitert.
- Canonical registry source: `agent_registry.json`.
- New control protocol: `AGENT_SUPERBRAIN_KONTROLLPROTOKOLL.md`.
- No-Lie rule remains strict: unproven runtime claims stay downgraded (`PARTIAL`, `BLOCKED`, `NOT VERIFIED`).
- Latest gate evidence (`.godmode_runtime/evidence/superbrain_gate_latest.json`):
  `inventory_verified=96.15%`, `inventory_live=100%`, `inventory_gate=100%`,
  `routing_live=100%`, `routing_gate=100%`, `external=100%`,
  `beta_core=100%`, `ga_full=100%`.
- Security rotation is tracked separately and remains `PARTIAL` until
  operator-side rotation acknowledgements are completed.

This document explains what the repository can actually start, wire, and
operate today.

For the detailed horizontal/vertical phase control model, use
`KONTROLLPROTOKOLL_00_07.md` as the canonical operational audit view.

## Canonical Companion Docs

- `KONTROLLPROTOKOLL_00_07.md`: detailed 00-07 control and acceptance matrix
- `STACK_GAP_ROADMAP.md`: repo-vs-guide comparison and prioritized gaps
- `walkthrough.md`: short repo-verified overview
- `ENV_REFERENCE.md`: shared environment variable contract
- `PROVENANCE_MATRIX.md`: canonical vs archive source map
- `MISSION_PAYLOAD_CONTRACT.md`: canonical dispatcher schema
- `SUPERPOWERS_STATUS.md`: canonical 12-superpower status map (repo-local audit)
- `SELFHOSTED_CORE_RUNTIME_BETA_RUNBOOK.md`: minimal operator runbook for the
  provider-neutral beta core runtime
- `HETZNER_SELFHOSTED_DEPLOY_RUNBOOK.md`: canonical remote rollout runbook for
  host `65.108.253.14`
- `PM2_SELFHOSTED_RUNBOOK.md`: tracked PM2 supervision profile for host-side
  tooling
- `ORACLE_DUAL_TRACK_RUNBOOK.md`: Oracle recovery and gate rules for the
  parallel dual-track model
- `BEGINNER_DEV_PLAYBOOK_3D_AND_APPS.md`: step-by-step guide for 3D games,
  normal apps, and Open-Source-AI usage
- `AGENT_SUPERBRAIN_KONTROLLPROTOKOLL.md`: merged agent registry, routing gates,
  zero-compute policy, and beta/ga release criteria

Token fallback note:
- startup scripts now auto-load `HF_TOKEN` from local cache
  (`~/.cache/huggingface/token`) when `.godmode_env` leaves it empty, and map
  it to `BOLTDIY_SPACE_TOKEN` unless explicitly overridden.

## Hosted Sync 2026-04-10

- `OpenHands`: `https://wrzzzrzr-openhands-godmode.hf.space` rebuilt from
  `hf_openhands/` and returned HTTP `200` after the wrapper bootstrap fix.
- `LangGraph`: `https://wrzzzrzr-langgraph-godmode.hf.space/health` returned
  HTTP `200`.
- `smolagents`: `https://wrzzzrzr-smolagents-godmode.hf.space` was created from
  `hf_smolagents/` and returned HTTP `200`.
- `Aider`: canonical hosted surface is now
  `https://wrzzzrzr-aider-godmode-safe.hf.space`, which returned HTTP `200`.
  The old `aider-web-ide` Space remains paused due a historical Hugging Face
  abuse flag and should be treated as retired.
- `Pilot`: `Wrzzzrzr/godmode-pilot` is private, HF API reports runtime stage
  `RUNNING`, and an authenticated `/health` request returned HTTP `200` on
  2026-04-10 with a body synced to the last fully reverified GitHub `main`
  snapshot `62c5baa...`; the pilot refresh patch remains deployed on Space SHA
  `4155ac5...`.
- `n8n local`: health and memory paths are proven, and after hardening the
  webhook node name plus env split on 2026-04-10, the local production mission
  URL
  `POST /webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission`
  returned HTTP `200`. On 2026-04-11 the mission workflow was imported,
  published, restarted, and re-smoked as active runtime path; the concrete
  registered route remains the canonical dispatch target.
- `Future Oracle profile`: the reserved host values in `.godmode_env` remain a
  documented future profile only. `Test-Connection` to the current
  `ORACLE_IP` (`132.145.225.182`) was `False` on 2026-04-10, direct TCP probes
  to ports `22`, `3000`, `3001`, `4000`, `5678`, `8080`, and `11434` timed
  out, and a short traceroute reached `140.91.199.85` before timing out.
  This is now a `PLACEHOLDER`/future-host note, not an active blocker for the
  provider-neutral local, selfhosted, or HF-facade runtime model.

## What Startup Scripts Really Do

### Windows local startup

`START_GODMODE.ps1` currently starts:

- `OpenHands` from `openhands/` on port `3000`
- the `OpenHands` adapter on port `3001`
- `n8n` from `n8n/` on port `5678`
- `LangGraph` from `langgraph/` on port `8080`

It also recovers or persists a stable local `n8n` encryption key, prints the
current local entrypoints, performs HTTP health checks, and reminds operators
that Aider is started separately through `aider_godmode.ps1`.
It now also enforces n8n mission-workflow import + publish + restart + webhook
smoke, plus n8n memory-probe import + execute (saved-marker check) as part of
startup.

### Selfhosted core shell startup

`START_GODMODE.sh` performs the same orchestration for a Linux/selfhosted core
environment, including stable `n8n` key handling, optional Docker context
selection, and post-start health checks, and prints local plus hosted
endpoints. It also enforces the same n8n mission import/publish/smoke sequence
plus memory-probe import/execute.
The reserved Oracle variables now stay disabled future-profile inputs unless an
operator deliberately reactivates that profile later.

### Canonical remote deploy entry

`ops/deploy_hetzner_core.ps1` is now the single canonical remote deployment
entry for the active Hetzner selfhosted track (`65.108.253.14`), including:

- SSH preflight and port inventory evidence
- remote bootstrap (`Docker`, `Nginx`, `Certbot`, `UFW`)
- repo sync plus server-side `.godmode_env` rendering
- stack bring-up via `START_GODMODE.sh`
- HTTPS ingress for `openhands`, `adapter`, `langgraph`, `n8n`, and `bolt`

## Component Reality Map

### OpenHands

- Local runtime definition: `openhands/docker-compose.yml`
- Stable trigger facade: `openhands/adapter.py`
- Hosted wrapper: `hf_openhands/`
- Current state: local runtime plus hosted HF wrapper are both proven; the HF
  wrapper now preserves the upstream launch command, normalizes shell line
  endings, and serves HTTP `200`, while the optional future Oracle profile
  remains only a documented placeholder

### bolt.diy hybrid facade

- Local runtime definition: `bolt_facade/docker-compose.yml`
- Service logic: `bolt_facade/app.py`
- Validation helper: `verify_bolt_facade.py`
- Current state: dispatch order is now fixed to
  `bolt-facade -> n8n -> openhands-adapter`; external bolt forwarding can be
  blocked while still persisting local audit artifacts and forwarding to local
  targets; if `BOLTDIY_SPACE_URL` is not set, the facade resolves the canonical
  target from `BOLTDIY_SPACE_ID` (`Wrzzzrzr/bolt-diy-godmode` by default)

### Core tools bridge

- Local runtime: `core_tools_bridge.py`
- Adapter forwarding: `openhands/adapter.py`
- Current state: explicit local endpoints now exist for
  `POST /run_playwright`, `POST /run_devtools`, `POST /snapshot_devtools`,
  plus `GET /health` and `GET /metrics`

### Aider

- Local launcher: `aider_godmode.ps1`
- Hosted/remote references: `godmode_auto_pilot.py`, `hf_aider/README.md`
- Current state: usable local launcher exists and a HF-safe hosted surface is
  now deployed at `aider-godmode-safe`; the previously flagged `aider-web-ide`
  Space is no longer the canonical target

### smolagents

- Main implementation: `hf_smolagents/app.py`
- Canonical hosted/local notes: `hf_smolagents/README.md`
- Current state: real multi-agent Gradio tooling exists, including a vision
  helper and managed agents, and the hosted `smolagents-godmode` Space is live

### LangGraph

- Local runnable service: `langgraph/system.py`, `langgraph/docker-compose.yml`
- Hosted facade: `hf_langgraph_space/app.py`
- Current state: local `/health` and `/run` are runtime-proven; provider
  failures now degrade cleanly to offline responses, but this is still not the
  full 8-agent system described in the external guide

### n8n

- Local deployment: `n8n/docker-compose.yml`
- Workflow evidence: `n8n_memory_workflow.json`
- Mission intake workflow: `n8n_mission_workflow.json`
- Current state: mission and memory workflows are now imported/executed as part
  of startup and are runtime-proven locally; hosted credentials remain an
  external operator concern

### LiteLLM

- Local deployment: `litellm/docker-compose.yml`
- Router config: `litellm_config.yaml`
- Current state: config and runtime path are now both present in the repo;
  health verification remains environment-dependent on valid provider keys

### Pilot / autonomy layer

- Hosted loop: `hf_pilot_actual/app.py`
- Mission sync: `autonomy_guard.py`
- Memory sink: `memory_vault.md`
- Current state: real repo-sync and mission-state logic exists, with a local
  debug-safe `/health` path and a HF-hosted private pilot proven by both the
  authenticated HF API and an authenticated hosted `/health` request; live
  automation still depends on external webhooks and cross-service routing

## Integration Reality Today

The repo shows clear integration intent, but only some bridges are materially
implemented.

Currently evidenced:

- startup scripts now co-start `bolt-facade` and verify its health
- startup scripts can co-start `OpenHands`, `n8n`, and `LangGraph` and verify
  their health locally
- startup scripts now also co-start `LiteLLM` and the host-side core tools
  bridge and verify both health paths
- the OpenHands adapter accepts the canonical mission payload locally
- the OpenHands adapter now forwards `run_playwright`, `run_devtools`, and
  `snapshot_devtools` to the core tools bridge
- LangGraph `/run` returns a controlled result even when the configured live
  provider is unavailable
- HF-hosted `OpenHands`, `LangGraph`, `smolagents`, and the safe Aider surface
  are all materially deployed, with direct HTTP `200` proof for every public
  Space
- pilot code can trigger `n8n` or the OpenHands adapter if configured
- pilot code now prefers `bolt-facade` dispatch first when configured
- n8n memory workflow targets `memory_vault.md`
- the canonical mission payload contract is shared across pilot, n8n, and adapter
- the frontend verification path is locally proven through build, Playwright,
  and AI-browser debug
- the 12-superpower local gate is now audited through `verify_superpowers.py`
  with snapshot output in `.godmode_runtime/evidence/superpowers_audit_latest.json`

Not yet fully materialized as local end-to-end integrations:

- `Aider <-> OpenHands` proof at runtime
- `smolagents <-> LangGraph` proof at runtime
- consistently reachable external `bolt.diy` dispatch in environments without
  valid token/space access
- a generic published n8n slug without workflow-id/node-name path segments

## Runtime Gate Evidence

- HF runtime evidence script: `verify_hf_runtime.py`
  - writes snapshots under `.godmode_runtime/evidence/`
  - validates public core spaces and classifies private/blocked targets
- Oracle dual-track probe script: `oracle_probe.py`
  - writes snapshots under `.godmode_runtime/evidence/`
  - reports `PASS` or `BLOCKED` without forcing Oracle into active runtime

## Operational Boundaries

- Anything that requires future Oracle provisioning, Hugging Face Space
  settings, secret management, hosted URLs, or account access should be
  treated as external operator work unless separately verified.
- Hugging Face Space status in this document is verified as of 2026-04-10 and
  should be rechecked before later rollout decisions.
- This repository is a hybrid of runnable local components, hosted wrappers,
  and external HF services such as `bolt.diy`.
