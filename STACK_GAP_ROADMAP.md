# GODMODE Guide-vs-Repo Gap Roadmap

Stand: 2026-04-11

Provider-neutral migration note:
- Oracle is no longer treated as an active required host in the canonical
  runtime model.
- Remaining Oracle references in this roadmap are historical guide-comparison
  evidence or future-profile placeholders unless a line explicitly says
  otherwise.

## Executive Summary

This document compares the external guide `C:\Users\immer\Downloads\godmode_stack_guide.html` with the actual repository state in `d:\Web\docs\godmode_setup`.

The repository already contains meaningful implementation artifacts for
`OpenHands`, `smolagents`, `Aider`, `LangGraph`, `n8n`, a
`master env/startup` pattern, hosted pilot/autonomy support, and now a local
`bolt.diy` hybrid facade plus external target wiring. However, the guide is
broader and more ambitious than the current repo evidence:

- several stack modules exist only as partial implementations or thin wrappers,
- operator documentation now has a baseline, including a canonical Hetzner
  remote deploy entry, but deeper multi-provider runbooks are still incomplete,
- external future-Oracle, Hugging Face, account, secret, and provisioning steps are mostly not verifiable from the repo alone,
- `bolt.diy` now has a repo-authored local hybrid facade, while external
  hosted ownership and true external runtime behavior remain only partially
  verifiable from this repo,
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
| bolt.diy — Die Web IDE im Browser | `partial` | `bolt_facade/app.py`; `bolt_facade/docker-compose.yml`; `.godmode_env.example`; `BOLTDIY_EXTERNAL_INTEGRATION.md`; `START_GODMODE.sh` | The stack now has a local hybrid facade and dispatch/fallback evidence path while external hosted ownership and external runtime specifics remain partially verifiable. |
| smolagents — HuggingFace Native Agents | `partial` | `hf_smolagents/app.py` implements multi-agent Gradio tooling with search/web/python/vision capabilities | Repo contains real agent code, but the guide's hosted setup and "browser-agent deep access" are only partially represented and remain partly external. |
| Aider — Der Git-Native Code Wizard | `partial` | `hf_aider/README.md`; `aider_godmode.ps1`; `godmode_auto_pilot.py` references `Aider-Cloud` and an HF Space URL | The repo clearly targets Aider integration, but any future Oracle installation path from the guide is only a placeholder and not part of the active required runtime. |
| LangGraph — Der 8-Agent Orchestrator | `partial` | `langgraph/system.py`; `hf_langgraph_space/app.py`; `hf_langgraph/README.md`; `STACK_OPERATIONS.md`; `START_GODMODE.sh` starts a LangGraph API | Repo has a working LangGraph-shaped service, but not the 8-agent orchestrator promised by the guide. Current implementation is a much smaller single-flow planner/swarm/review pipeline. |
| n8n — Die Automation Engine | `partial` | `n8n/docker-compose.yml`; `n8n_memory_workflow.json`; `n8n_mission_workflow.json`; `hf_pilot_actual/app.py` | Repo contains real automation artifacts and canonical mission payloads, but live production import and operator credentialing remain external. |
| Stack Integration — Alles zusammenschalten | `partial` | `START_GODMODE.sh`; `START_GODMODE.ps1`; `MISSION_PAYLOAD_CONTRACT.md`; `hf_pilot_actual/app.py`; `openhands/adapter.py` | The repo now includes a concrete payload contract and adapter path, but full live end-to-end proof across every subsystem is still partially external. |
| ULTIMATE SUPERKRÄFTE, GEHEIMZAUBER & MAGISCHE FÄHIGKEITEN | `implemented` | `verify_superpowers.py`; `.godmode_runtime/evidence/superpowers_audit_latest.json`; `SUPERPOWERS_STATUS.md`; `hf_smolagents/app.py`; `langgraph/system.py`; `n8n_*_workflow.json` | The repo now includes a dedicated 12-superpower audit with runtime evidence and strict 12/12 local verification. Hosted/private external tracks remain documented separately. |

## Cross-Cutting Building Blocks

### master env/startup

Status: `partial`

Repo evidence:

- `.godmode_env` exists as a shared environment file artifact.
- `.godmode_env.example` and `ENV_REFERENCE.md` provide the new sanitized documentation baseline.
- `START_GODMODE.sh` coordinates `bolt-facade`, `OpenHands`, `n8n`,
  `LangGraph`, and external URLs for hosted services.
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
2. `bolt.diy` is a first-class subsystem in the guide; the repo now has a
   real hybrid facade but still depends on external hosted ownership for
   complete proof.
3. `LangGraph` is presented in the guide as an 8-agent orchestrator, while the local code currently exposes a much smaller FastAPI + single-node flow.
4. `OpenHands` and `LangGraph` now have baseline operator docs and a canonical
   Hetzner deploy entry, but deeper multi-provider deployment and integration
   runbooks are still missing.
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
- Closed 2026-04-10: explicit runtime wiring for `run_playwright`,
  `run_devtools`, and `snapshot_devtools` now exists in
  `core_tools_bridge.py` plus OpenHands adapter forwarding.
- Closed 2026-04-10: a tracked PM2 ecosystem file and selfhosted PM2 runbook
  now exist as `pm2/ecosystem.config.cjs` and `PM2_SELFHOSTED_RUNBOOK.md`.
- Closed 2026-04-10: a dedicated LiteLLM Compose runtime now exists at
  `litellm/docker-compose.yml`, so the router is no longer config-only.
- Closed 2026-04-11: startup scripts now enforce n8n mission-workflow
  import+publish+restart+webhook-smoke and use the shared `godmode_core`
  network for stable service-to-service routing.

### P2 — Plan Deeper Integration And Missing Systems

- Keep `bolt.diy` documented as a hybrid subsystem: repo-authored local facade
  plus external HF dependency with explicit operator contracts.
- Expand `LangGraph` only if the project truly needs the guide's promised multi-agent orchestrator; otherwise document the slimmer current reality.
- Upgrade the repo from "artifact collection" to "runnable platform" only after documentation and secret management are stabilized.
- Add verification steps for hosted services so future docs can distinguish "exists in code" from "confirmed live".

## Beta Closure Decisions 2026-04-11

This section records what is good enough for the current beta and what remains
outside the minimal beta scope.

| Domain | Current class | Beta decision | Beta treatment | Full-version dependency |
| --- | --- | --- | --- | --- |
| Architektur & Voraussetzungen | `partial` | minimal implementation required | keep provider-neutral startup scripts plus a tracked selfhosted example profile and a dedicated runbook | real remote DNS, SSH, TLS, and operator secrets |
| OpenHands | `partial` | minimal implementation required | local compose runtime plus adapter and HF wrapper are sufficient for beta | deeper upstream trigger proof and broader hosted ops runbooks |
| bolt.diy | `partial` | minimal implementation required | keep local hybrid facade as canonical dispatch/fallback layer while external target remains explicit | real hosted bolt.diy ownership, deployment, and live verification |
| smolagents | `partial` | current implementation is sufficient | keep current app plus HF facade; document that deeper browser-agent claims remain partial | deeper autonomous browser/runtime proof |
| Aider | `partial` | current implementation is sufficient | keep local launcher plus safe HF facade | broader remote operator automation and richer hosted workflows |
| LangGraph | `partial` | minimal implementation is sufficient | current planner/swarm/review service is enough for beta; do not fake the 8-agent guide version | actual multi-agent expansion if the product later requires it |
| n8n | `partial` | minimal implementation required | keep local workflow JSONs, verified health, concrete production webhook path, and automated import/publish in startup scripts | hosted credentials and external environment-specific rollout |
| Stack Integration | `partial` | minimal implementation required | keep the canonical mission payload, startup scripts, and verified local mission path | full cross-service end-to-end proof across every hosted subsystem |
| Deployment runbooks | `partial` | minimal implementation required | dedicated selfhosted beta runbook plus canonical Hetzner deploy script/runbook now exist; keep external hosted steps documented as operator work | environment-specific rollout guides per provider |
| Superpowers / manifesto claims | `implemented` | current implementation is sufficient | keep `verify_superpowers.py` + `SUPERPOWERS_STATUS.md` as canonical local proof path | hosted/private external expansion remains a separate track |

## Module Notes For Beta

### External-only modules

- `bolt.diy` now has a repo-authored local hybrid facade for dispatch/fallback
  while hosted ownership and external runtime proof remain external work.

### Partial but non-blocking modules

- `LangGraph` remains slimmer than the guide narrative, but the current service
  is real and documented.
- `smolagents` remains a genuine hosted/local capability with partial deeper
  automation proof.
- `Aider` remains beta-usable through the local launcher and the safe hosted
  facade.
- `LiteLLM` is now wired with a local runtime path in addition to config,
  but still depends on real provider credentials for meaningful model routing.

### Newly closed documentation gap

- The repo now includes
  [SELFHOSTED_CORE_RUNTIME_BETA_RUNBOOK.md](/d:/Web/docs/godmode_setup/SELFHOSTED_CORE_RUNTIME_BETA_RUNBOOK.md)
  as the minimal operator runbook for a provider-neutral beta without Oracle.
- The repo now includes
  [HETZNER_SELFHOSTED_DEPLOY_RUNBOOK.md](/d:/Web/docs/godmode_setup/HETZNER_SELFHOSTED_DEPLOY_RUNBOOK.md)
  plus `ops/deploy_hetzner_core.ps1` as the canonical remote deploy track for
  host `65.108.253.14`.
- The repo now includes
  [PM2_SELFHOSTED_RUNBOOK.md](/d:/Web/docs/godmode_setup/PM2_SELFHOSTED_RUNBOOK.md)
  plus `pm2/ecosystem.config.cjs` for tracked PM2 supervision.
- The repo now includes
  [BEGINNER_DEV_PLAYBOOK_3D_AND_APPS.md](/d:/Web/docs/godmode_setup/BEGINNER_DEV_PLAYBOOK_3D_AND_APPS.md)
  as the beginner-safe operator/developer guide.

## Evidence Rules For Future Updates

- Every roadmap claim should cite at least one repo-local file, script, config, or directory unless the claim is explicitly marked `external`.
- New stack status updates should use only the four labels defined here: `implemented`, `partial`, `missing`, `external`.
- Hosted URLs or cloud setup claims should never be treated as `implemented` unless the repo also contains enough operator-facing evidence to reproduce or verify them.
