# GODMODE Environment Reference

Stand: 2026-04-11

This document defines the only tracked secret contract for the GODMODE stack.
Real values live in `.godmode_env`. Tracked files must reference only env vars
or documented placeholders.

## File Contract

- Real runtime secrets live in `.godmode_env`
- `.godmode_env` is gitignored and must remain untracked
- Safe onboarding starts from `.godmode_env.example`
- Launchers expect shell-style lines in the form `export KEY="value"`
- Windows launchers translate the same contract into process env vars at runtime

## Security Rules

- Never commit real tokens, passwords, webhook URLs with embedded creds, or
  credentialed Git remotes
- Treat `.godmode_env` as operator-only local state
- If a token ever appeared in tracked history, in a screenshot, or in a remote
  URL, rotate it immediately
- Hugging Face Spaces, GitHub, n8n, and local Docker services must all consume
  credentials from env or host secret stores only

## Variable Groups

### LLM providers

- `ANTHROPIC_API_KEY`
- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`

Used by: `OpenHands`, `LangGraph`, `smolagents`, Aider, and hosted integrations.

### Hugging Face

- `HF_TOKEN`
- `HF_USERNAME`
- `HF_AIDER_SPACE_URL`
- `HF_OPENHANDS_SPACE_URL`
- `HF_LANGGRAPH_SPACE_URL`
- `HF_PILOT_SPACE_URL`
- `BOLTDIY_SPACE_URL`
- `BOLTDIY_SPACE_ID`
- `HF_VERIFY_STRICT`

Used by: Hugging Face Spaces and hosted wrappers.

`HF_VERIFY_STRICT` is consumed by `verify_hf_runtime.py` to decide whether
private-space 401/403 responses must fail the HF gate (`true`) or stay
`NOT VERIFIED` (`false`).

### Hetzner selfhosted deployment metadata

- `HETZNER_HOST_IP`
- `HETZNER_FQDN_ROOT`
- `HETZNER_TLS_EMAIL`
- `HETZNER_API_TOKEN`

Used by: `ops/deploy_hetzner_core.ps1` as canonical deployment parameters for
the active selfhosted core runtime target.

### GitHub

- `GITHUB_TOKEN`
- `GITHUB_USERNAME`
- `GITHUB_REPO`
- `GITHUB_REPO_URL`

Used by: pilot sync loops, repo-aware agents, and OpenHands workspace access.

### Local routing and model proxy

- `LITELLM_URL`
- `LITELLM_PORT`
- `LITELLM_API_KEY`
- `OLLAMA_BASE_URL`
- `OPENAI_BASE_URL`
- `MODEL_ROUTER_NAME`

Used by: cost-aware routing, proxying, and provider compatibility layers.

### bolt.diy hybrid facade

- `BOLTDIY_MODE`
- `BOLTDIY_FACADE_PORT`
- `BOLTDIY_FACADE_URL`
- `BOLTDIY_FACADE_INTERNAL_URL`
- `BOLTDIY_FORWARD_TIMEOUT`
- `BOLTDIY_SPACE_ID`
- `BOLTDIY_SPACE_TOKEN`

Used by: `bolt_facade/app.py`, `bolt_facade/docker-compose.yml`, pilot dispatch,
and n8n bridge routing.

Default tracked mode:

- `BOLTDIY_MODE=hybrid`
- dispatch order is fixed to: `bolt-facade -> n8n -> openhands-adapter`
- when external `bolt.diy` forwarding is blocked, the facade persists a local
  audit artifact instead of silently dropping the dispatch
- if `BOLTDIY_SPACE_URL` is empty, the facade resolves the external target from
  `BOLTDIY_SPACE_ID` (default `Wrzzzrzr/bolt-diy-godmode`)
- startup scripts autoload `HF_TOKEN` from the local Hugging Face cache file
  (`~/.cache/huggingface/token`) when `HF_TOKEN` is unset
- if `BOLTDIY_SPACE_TOKEN` is unset, startup scripts default it to `HF_TOKEN`

### DevTools / Playwright bridge

- `DEVTOOLS_BRIDGE_ENABLED`
- `DEVTOOLS_BRIDGE_HOST`
- `DEVTOOLS_BRIDGE_PORT`
- `DEVTOOLS_BRIDGE_URL`
- `DEVTOOLS_BRIDGE_TIMEOUT`
- `DEVTOOLS_BRIDGE_COMMAND_TIMEOUT`
- `DEVTOOLS_FRONTEND_DIR`

Used by: `core_tools_bridge.py`, OpenHands adapter bridge forwarding, and
optional PM2 selfhosted supervision.

Default tracked port:

- `DEVTOOLS_BRIDGE_PORT=3911` to avoid the local port collision observed on
  `3900` during 2026-04-10 validation.

### Core runtime profile

- `CORE_RUNTIME_PROVIDER`
- `CORE_RUNTIME_MODE`
- `CORE_RUNTIME_HOST`
- `CORE_RUNTIME_PUBLIC_URL`
- `CORE_RUNTIME_SSH_HOST`
- `CORE_DOCKER_CONTEXT`
- `CORE_DEPLOY_PROFILE`
- `GODMODE_CORE_NETWORK`
- `LOCAL_HEALTHCHECK_HOST`

Used by: startup scripts, operator status output, and provider-neutral runtime
selection.

Status model:

- `CORE_RUNTIME_PROVIDER` and `CORE_RUNTIME_MODE` are active selectors and
  the tracked example now defaults to `selfhosted` for the beta-ready remote
  core profile.
- A locally verified operator setup may still override both values to `local`
  inside `.godmode_env` without changing the tracked template.
- `CORE_RUNTIME_HOST` and `CORE_RUNTIME_PUBLIC_URL` are active and define where
  local or selfhosted health probes should point. The tracked selfhosted target
  now uses Hetzner host IP `65.108.253.14`, while public ingress is mapped via
  TLS FQDN endpoints (`openhands.*`, `adapter.*`, `langgraph.*`, `n8n.*`,
  `bolt.*`).
- `CORE_RUNTIME_SSH_HOST` is optional and only relevant for future remote
  selfhosted execution; the tracked selfhosted example now aligns it to the
  same Hetzner host IP.
- `CORE_DOCKER_CONTEXT` is optional and allows Docker commands to target a
  non-default context without binding the stack to any specific provider.
- `CORE_DEPLOY_PROFILE` is active and should describe the intended runtime
  profile, such as `local`, `selfhosted`, or `hf-facade`. The tracked example
  now defaults to `selfhosted`.

Remote beta audit note:

- The tracked example intentionally favors a provider-neutral selfhosted remote
  profile because the current beta model no longer requires Oracle.
- The deploy automation entry is:
  - `.\ops\deploy_hetzner_core.ps1 -HostIp 65.108.253.14 -SshUser root -FqdnRoot <fqdn> -TlsEmail <email>`
- The tracked FQDN placeholders must still be replaced with real reachable DNS
  records before remote rollout.
- Real remote bring-up still requires operator-supplied DNS, reachability,
  authentication, and any reverse-proxy or TLS decisions.
- For the exact minimum path, see
  [SELFHOSTED_CORE_RUNTIME_BETA_RUNBOOK.md](/d:/Web/docs/godmode_setup/SELFHOSTED_CORE_RUNTIME_BETA_RUNBOOK.md).

### Aider

- `AIDER_MODEL`
- `AIDER_WEAK_MODEL`
- `AIDER_MAP_TOKENS`

Used by: `aider_godmode.ps1`, pilot execution, and Aider cloud workflows.

### OpenHands

- `OPENHANDS_PORT`
- `OPENHANDS_PUBLIC_URL`
- `OPENHANDS_API_URL`
- `OPENHANDS_API_INTERNAL_URL`
- `OPENHANDS_TRIGGER_URL`
- `OPENHANDS_API_KEY`
- `OPENHANDS_ADAPTER_URL`
- `OPENHANDS_ADAPTER_INTERNAL_URL`
- `OPENHANDS_ADAPTER_PORT`
- `OPENHANDS_LLM_MODEL`
- `OPENHANDS_LLM_BASE_URL`
- `DEVTOOLS_BRIDGE_URL`
- `DEVTOOLS_BRIDGE_TIMEOUT`

Used by: `openhands/docker-compose.yml`, the adapter service, and n8n triggers.

### LiteLLM runtime

- `LITELLM_PORT`
- `LITELLM_URL`
- `LITELLM_API_KEY`

Used by: `litellm/docker-compose.yml`, startup scripts, and model-routing
clients.

### LangGraph

- `LANGGRAPH_PORT`
- `LANGGRAPH_API_URL`
- `LANGGRAPH_API_INTERNAL_URL`
- `PROMPT_EVOLUTION_PATH`

Used by: local orchestration and prompt-evolution persistence.

### Core tools bridge endpoints

Runtime endpoints:

- `POST /run_playwright`
- `POST /run_devtools`
- `POST /snapshot_devtools`
- `GET /health`
- `GET /metrics`

Used by: local operator automation and OpenHands adapter endpoint forwarding.

### n8n

- `N8N_BASIC_AUTH_USER`
- `N8N_BASIC_AUTH_PASSWORD`
- `N8N_ENCRYPTION_KEY`
- `N8N_PORT`
- `N8N_WEBHOOK_BASE_URL`
- `N8N_WEBHOOK_URL`
- `N8N_WEBHOOK_INTERNAL_URL`
- `N8N_EDITOR_BASE_URL`
- `N8N_API_URL`
- `N8N_API_KEY`
- `MEMORY_VAULT_PATH`
- `BOLTDIY_FACADE_URL`

Used by: `n8n/docker-compose.yml`, workflow imports, mission triggers, and
memory persistence.

Important 2026-04-11 audit note:

- `N8N_WEBHOOK_BASE_URL` is the local base URL consumed by the n8n container
  itself via `WEBHOOK_URL`.
- `N8N_WEBHOOK_URL` is the concrete mission-dispatch target used by pilot and
  operator tooling.
- The repo and runtime were hardened on 2026-04-10 so the active local mission
  dispatch path is now
  `http://localhost:5678/webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission`,
  which returned HTTP `200`.
- On 2026-04-11 this workflow was imported, published, and restarted by the
  startup scripts, then re-smoked successfully via the same concrete path.
- A short slug such as `/webhook/godmode-mission` may exist in some n8n
  versions, but it is treated as fallback only. The long concrete route above
  stays canonical for evidence.
- In the tracked selfhosted example template, the same path now points to the
  placeholder FQDN `n8n.replace-with-fqdn-root`. That value is not a live
  runtime claim and must be replaced before a real remote rollout.
- Do not collapse base URL and dispatch URL into the same variable again: that
  caused a real runtime drift between local compose wiring and pilot dispatch.

### Pilot / mission payload

- `GODMODE_SOURCE`
- `GODMODE_MISSION_AGENT`

Used by: `hf_pilot_actual/` and the mission payload contract.

### Future Oracle placeholder profile

- `ORACLE_ENABLED`
- `ORACLE_PLACEHOLDER`
- `ORACLE_RESERVED_FOR_FUTURE`
- `ORACLE_VERIFY_ENABLED`
- `ORACLE_IP`
- `ORACLE_USER`

Used by: documented future-profile placeholders only.

Important 2026-04-10 audit note:

- Oracle is no longer part of the active required runtime model.
- `ORACLE_ENABLED=false` and `ORACLE_PLACEHOLDER=true` should remain the
  default tracked state.
- `ORACLE_RESERVED_FOR_FUTURE=true` explicitly marks these variables as a
  retained future profile, not an active dependency.
- `ORACLE_IP` and `ORACLE_USER` may remain in `.godmode_env` as reserved
  operator values, but they must not be required for local, selfhosted, or HF
  facade operation unless a future Oracle profile is deliberately activated.
- `ORACLE_VERIFY_ENABLED=true` activates the dual-track probe flow via
  `oracle_probe.py`; this does not force Oracle into the active core runtime.

## Minimum Component Requirements

### OpenHands

Minimum practical set:

- `OPENHANDS_LLM_MODEL`
- `OPENHANDS_LLM_BASE_URL`
- `GITHUB_TOKEN`
- any provider key required by the selected backend

### LangGraph

Minimum practical set:

- `LANGGRAPH_API_URL`
- one usable model backend or the offline fallback mode

### n8n

Minimum practical set:

- `N8N_BASIC_AUTH_USER`
- `N8N_BASIC_AUTH_PASSWORD`
- `N8N_ENCRYPTION_KEY`
- `N8N_WEBHOOK_BASE_URL`
- `N8N_WEBHOOK_URL`

### Aider

Minimum practical set:

- `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY`
- `AIDER_MODEL`
- `AIDER_WEAK_MODEL`

### bolt.diy facade

Minimum practical set:

- `BOLTDIY_MODE=hybrid`
- `BOLTDIY_FACADE_URL`
- `BOLTDIY_SPACE_URL`
- `BOLTDIY_SPACE_ID`
- `BOLTDIY_SPACE_TOKEN`
- `N8N_WEBHOOK_URL`
- `OPENHANDS_ADAPTER_URL`

## Related Files

- [`.godmode_env.example`](/d:/Web/docs/godmode_setup/.godmode_env.example)
- [START_GODMODE.sh](/d:/Web/docs/godmode_setup/START_GODMODE.sh)
- [START_GODMODE.ps1](/d:/Web/docs/godmode_setup/START_GODMODE.ps1)
- [aider_godmode.ps1](/d:/Web/docs/godmode_setup/aider_godmode.ps1)
- [STACK_OPERATIONS.md](/d:/Web/docs/godmode_setup/STACK_OPERATIONS.md)
- [ops/deploy_hetzner_core.ps1](/d:/Web/docs/godmode_setup/ops/deploy_hetzner_core.ps1)
- [HETZNER_SELFHOSTED_DEPLOY_RUNBOOK.md](/d:/Web/docs/godmode_setup/HETZNER_SELFHOSTED_DEPLOY_RUNBOOK.md)
- [verify_hf_runtime.py](/d:/Web/docs/godmode_setup/verify_hf_runtime.py)
- [oracle_probe.py](/d:/Web/docs/godmode_setup/oracle_probe.py)
- [BEGINNER_DEV_PLAYBOOK_3D_AND_APPS.md](/d:/Web/docs/godmode_setup/BEGINNER_DEV_PLAYBOOK_3D_AND_APPS.md)
