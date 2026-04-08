# GODMODE Stack Operations

Stand: 2026-04-08

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
- `SUPERPOWERS_STATUS.md`: implemented vs partial superpower map

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

### Oracle-style shell startup

`START_GODMODE.sh` performs the same orchestration for a Linux/Oracle-shaped
environment, including stable `n8n` key handling and post-start health checks,
and prints local plus hosted endpoints.

## Component Reality Map

### OpenHands

- Local runtime definition: `openhands/docker-compose.yml`
- Stable trigger facade: `openhands/adapter.py`
- Hosted wrapper: `hf_openhands/`
- Current state: real container/runtime artifacts exist, but hosted and
  multi-agent operating procedures are still partial

### Aider

- Local launcher: `aider_godmode.ps1`
- Hosted/remote references: `godmode_auto_pilot.py`, `hf_aider/README.md`
- Current state: usable entrypoint exists, but broader cloud wiring is partly
  documentation- and environment-dependent

### smolagents

- Main implementation: `hf_smolagents/app.py`
- Canonical hosted/local notes: `hf_smolagents/README.md`
- Current state: real multi-agent Gradio tooling exists, including a vision
  helper and managed agents

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
- Current state: automation direction is real, but production workflows and
  hosted credentials are only partially proven from the repo

### Pilot / autonomy layer

- Hosted loop: `hf_pilot_actual/app.py`
- Mission sync: `autonomy_guard.py`
- Memory sink: `memory_vault.md`
- Current state: real repo-sync and mission-state logic exists, with a local
  debug-safe `/health` path, but live automation still depends on external
  tokens, webhooks, and hosted runtime

## Integration Reality Today

The repo shows clear integration intent, but only some bridges are materially
implemented.

Currently evidenced:

- startup scripts can co-start `OpenHands`, `n8n`, and `LangGraph` and verify
  their health locally
- the OpenHands adapter accepts the canonical mission payload locally
- LangGraph `/run` returns a controlled result even when the configured live
  provider is unavailable
- pilot code can trigger `n8n` or the OpenHands adapter if configured
- n8n memory workflow targets `memory_vault.md`
- the canonical mission payload contract is shared across pilot, n8n, and adapter
- the frontend verification path is locally proven through build, Playwright,
  and AI-browser debug

Not yet fully materialized as local end-to-end integrations:

- `Aider <-> OpenHands` proof at runtime
- `smolagents <-> LangGraph` proof at runtime
- live `bolt.diy` verification inside this repo

## Operational Boundaries

- Anything that requires Oracle provisioning, Hugging Face Space settings,
  secret management, hosted URLs, or account access should be treated as
  external operator work unless separately verified.
- This repository is a hybrid of runnable local components, hosted wrappers,
  and external HF services such as `bolt.diy`.
