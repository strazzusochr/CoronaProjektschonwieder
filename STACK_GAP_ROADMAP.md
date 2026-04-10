# GODMODE Guide-vs-Repo Gap Roadmap

Stand: 2026-04-08

Provider-neutral migration note:
- Oracle is no longer treated as an active required host in the canonical
  runtime model.
- Remaining Oracle references in this roadmap are historical guide-comparison
  evidence or future-profile placeholders unless a line explicitly says
  otherwise.

## Executive Summary

This document compares the external guide `C:\Users\immer\Downloads\godmode_stack_guide.html` with the actual repository state in `d:\Web\docs\godmode_setup`.

The repository already contains meaningful implementation artifacts for `OpenHands`, `smolagents`, `Aider`, `LangGraph`, `n8n`, a `master env/startup` pattern, hosted pilot/autonomy support, and an external canonical `bolt.diy` position. However, the guide is broader and more ambitious than the current repo evidence:

- several stack modules exist only as partial implementations or thin wrappers,
- operator documentation now has a baseline, but deeper hosted/local runbooks are still incomplete,
- external future-Oracle, Hugging Face, account, secret, and provisioning steps are mostly not verifiable from the repo alone,
- `bolt.diy` is intentionally external-only and not implemented as a local module,
- older narrative docs, especially `walkthrough.md`, previously mixed live status, proof, and roadmap concerns and are no longer suitable as the canonical comparison artifact.

## Status Vocabulary

- `implemented`: repo contains direct, coherent artifacts for the domain and its local behavior is materially represented.
- `partial`: repo contains real artifacts, but the guide promises more than the repo currently proves.
- `missing`: the guide names the domain, but the repo lacks a concrete local implementation.
- `external`: the guide step depends on cloud accounts, provisioning, secrets, or hosted state that cannot be verified from the repo alone.

## Inventory Matrix

| Guide domain | Status | Repo evidence | Gap notes |
| --- | --- | --- | --- |
| Architektur & Voraussetzungen | `partial` | `.godmode_env` exists; `.godmode_env.example`; `ENV_REFERENCE.md`; `START_GODMODE.sh`; `START_GODMODE.ps1`; `openhands/docker-compose.yml`; `n8n/docker-compose.yml` | Repo shows the intended local/selfhosted core structure; future Oracle installation and host access remain external placeholder work. |
| OpenHands — Das Gehirn des Systems | `partial` | `openhands/docker-compose.yml`; `openhands/adapter.py`; `hf_openhands/entrypoint_hf.sh`; `hf_openhands/README.md`; `Deploy-OpenHands.ps1` | OpenHands runtime and a stable adapter layer exist, but live upstream trigger-proof remains partly external. |
| bolt.diy — Die Web IDE im Browser | `external` | `.godmode_env.example`; `BOLTDIY_EXTERNAL_INTEGRATION.md`; `START_GODMODE.sh` | The stack now treats `bolt.diy` as an intentional external HF service instead of a missing local module. |
| smolagents — HuggingFace Native Agents | `partial` | `hf_smolagents/app.py` implements multi-agent Gradio tooling with search/web/python/vision capabilities | Repo contains real agent code, but the guide's hosted setup and "browser-agent deep access" are only partially represented and remain partly external. |
| Aider — Der Git-Native Code Wizard | `partial` | `hf_aider/README.md`; `aider_godmode.ps1`; `godmode_auto_pilot.py` references `Aider-Cloud` and an HF Space URL | The repo clearly targets Aider integration, but any future Oracle installation path from the guide is only a placeholder and not part of the active required runtime. |
| LangGraph — Der 8-Agent Orchestrator | `partial` | `langgraph/system.py`; `hf_langgraph_space/app.py`; `hf_langgraph/README.md`; `STACK_OPERATIONS.md`; `START_GODMODE.sh` starts a LangGraph API | Repo has a working LangGraph-shaped service, but not the 8-agent orchestrator promised by the guide. Current implementation is a much smaller single-flow planner/swarm/review pipeline. |
| n8n — Die Automation Engine | `partial` | `n8n/docker-compose.yml`; `n8n_memory_workflow.json`; `n8n_mission_workflow.json`; `hf_pilot_actual/app.py` | Repo contains real automation artifacts and canonical mission payloads, but live production import and operator credentialing remain external. |
| Stack Integration — Alles zusammenschalten | `partial` | `START_GODMODE.sh`; `START_GODMODE.ps1`; `MISSION_PAYLOAD_CONTRACT.md`; `hf_pilot_actual/app.py`; `openhands/adapter.py` | The repo now includes a concrete payload contract and adapter path, but full live end-to-end proof across every subsystem is still partially external. |
| ULTIMATE SUPERKRÄFTE, GEHEIMZAUBER & MAGISCHE FÄHIGKEITEN | `partial` | `hf_smolagents/app.py` includes `VisualDebugTool`; `autonomy_guard.py`; `memory_vault.md`; `n8n_memory_workflow.json`; `GODMODE_BIBLE_V1.html`; `GODMODE_BIBLE_FINAL.html` | Some advanced capabilities exist as code or manifests, but many "superpowers" are still manifesto-level descriptions rather than verified subsystems. |

## Cross-Cutting Building Blocks

### master env/startup

Status: `partial`

Repo evidence:

- `.godmode_env` exists as a shared environment file artifact.
- `.godmode_env.example` and `ENV_REFERENCE.md` provide the new sanitized documentation baseline.
- `START_GODMODE.sh` coordinates `OpenHands`, `n8n`, `LangGraph`, and external URLs for `bolt.diy` and `smolagents`.
- `START_GODMODE.ps1` provides the same idea for Windows/PowerShell.
- `aider_godmode.ps1` explicitly loads `.godmode_env` when present.

Gap notes:

- The repo proves the intended pattern, but not whether the secrets are portable, complete, or safely documented.
- The guide's "one master env everywhere" story needs a documented variable inventory and a sanitized template before this can be considered `implemented`.

### pilot/autonomy layer

Status: `partial`

Repo evidence:

- `hf_pilot_actual/app.py` clones or resets the repo, reads `GODMODE_GOAL.md`, emits the canonical mission payload, and runs the hosted pilot loop.
- `autonomy_guard.py` verifies SHA/proof state and can sync mission status to `DONE`.
- `memory_vault.md` is present as the audit/memory sink.

Gap notes:

- The autonomy layer is real, but operational dependencies on GitHub tokens, Hugging Face hosting, and n8n webhooks remain external.
- The current pilot story is split between scripts, proof files, and HTML manifesto documents instead of a single operator-facing reference.

## High-Signal Mismatches

1. The guide describes a larger and more operationally complete stack than the repo currently documents.
2. `bolt.diy` is a first-class subsystem in the guide, but it is intentionally external-only in the repo.
3. `LangGraph` is presented in the guide as an 8-agent orchestrator, while the local code currently exposes a much smaller FastAPI + single-node flow.
4. `OpenHands` and `LangGraph` now have baseline operator docs, but deeper deployment, verification, and integration runbooks are still missing.
5. `walkthrough.md` previously carried stale frontend/build claims and should no longer serve as the detailed status source for stack maturity.
6. External dependencies such as the future Oracle profile, Hugging Face Spaces, account provisioning, secrets, and hosted URLs are essential to the guide, but mostly unverifiable from the repo alone.

## Prioritized Roadmap

### P0 — Stabilize Canonical Documentation

- Maintain `STACK_GAP_ROADMAP.md` as the canonical repo-vs-guide comparison artifact.
- Keep `walkthrough.md` and `STACK_OPERATIONS.md` short, current, and focused on verified repo behavior.
- Validate `ENV_REFERENCE.md` and `.godmode_env.example` against any newly introduced secret usage.
- Expand the new `hf_openhands/` and `hf_langgraph/` README baselines with concrete verification steps once hosted environments are reproducible.

### P1 — Close Repo-Local Gaps For Already-Present Modules

- Document the actual local behavior of `OpenHands`, `smolagents`, `Aider`, `LangGraph`, and `n8n` using the artifacts already present in repo.
- Write down what each startup script really starts, what is local, and what is only a URL reference.
- Make the integration story explicit: where the repo has a real bridge today, where it only logs or simulates a bridge, and which environments are required for each step.
- Consolidate autonomy and mission-state docs so pilot loop, memory vault, and autonomy guard are explained in one coherent operator path.

### P2 — Plan Deeper Integration And Missing Systems

- Keep `bolt.diy` documented as an external HF dependency with explicit operator contracts instead of a fake local mirror.
- Expand `LangGraph` only if the project truly needs the guide's promised multi-agent orchestrator; otherwise document the slimmer current reality.
- Upgrade the repo from "artifact collection" to "runnable platform" only after documentation and secret management are stabilized.
- Add verification steps for hosted services so future docs can distinguish "exists in code" from "confirmed live".

## Evidence Rules For Future Updates

- Every roadmap claim should cite at least one repo-local file, script, config, or directory unless the claim is explicitly marked `external`.
- New stack status updates should use only the four labels defined here: `implemented`, `partial`, `missing`, `external`.
- Hosted URLs or cloud setup claims should never be treated as `implemented` unless the repo also contains enough operator-facing evidence to reproduce or verify them.
