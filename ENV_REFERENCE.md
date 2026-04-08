# GODMODE Environment Reference

Stand: 2026-04-08

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

Used by: Hugging Face Spaces and hosted wrappers.

### GitHub

- `GITHUB_TOKEN`
- `GITHUB_USERNAME`
- `GITHUB_REPO`
- `GITHUB_REPO_URL`

Used by: pilot sync loops, repo-aware agents, and OpenHands workspace access.

### Local routing and model proxy

- `LITELLM_URL`
- `LITELLM_API_KEY`
- `OLLAMA_BASE_URL`
- `OPENAI_BASE_URL`
- `MODEL_ROUTER_NAME`

Used by: cost-aware routing, proxying, and provider compatibility layers.

### Aider

- `AIDER_MODEL`
- `AIDER_WEAK_MODEL`
- `AIDER_MAP_TOKENS`

Used by: `aider_godmode.ps1`, pilot execution, and Aider cloud workflows.

### OpenHands

- `OPENHANDS_PORT`
- `OPENHANDS_PUBLIC_URL`
- `OPENHANDS_API_URL`
- `OPENHANDS_TRIGGER_URL`
- `OPENHANDS_API_KEY`
- `OPENHANDS_ADAPTER_URL`
- `OPENHANDS_ADAPTER_PORT`
- `OPENHANDS_LLM_MODEL`
- `OPENHANDS_LLM_BASE_URL`

Used by: `openhands/docker-compose.yml`, the adapter service, and n8n triggers.

### LangGraph

- `LANGGRAPH_PORT`
- `LANGGRAPH_API_URL`
- `PROMPT_EVOLUTION_PATH`

Used by: local orchestration and prompt-evolution persistence.

### n8n

- `N8N_BASIC_AUTH_USER`
- `N8N_BASIC_AUTH_PASSWORD`
- `N8N_ENCRYPTION_KEY`
- `N8N_PORT`
- `N8N_WEBHOOK_URL`
- `N8N_EDITOR_BASE_URL`
- `MEMORY_VAULT_PATH`

Used by: `n8n/docker-compose.yml`, workflow imports, mission triggers, and
memory persistence.

### Pilot / mission payload

- `GODMODE_SOURCE`
- `GODMODE_MISSION_AGENT`

Used by: `hf_pilot_actual/` and the mission payload contract.

### Infrastructure

- `ORACLE_IP`
- `ORACLE_USER`

Used by: operator status output and Oracle-shaped startup flows.

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
- `N8N_WEBHOOK_URL`

### Aider

Minimum practical set:

- `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY`
- `AIDER_MODEL`
- `AIDER_WEAK_MODEL`

## Related Files

- [`.godmode_env.example`](/d:/Web/docs/godmode_setup/.godmode_env.example)
- [START_GODMODE.sh](/d:/Web/docs/godmode_setup/START_GODMODE.sh)
- [START_GODMODE.ps1](/d:/Web/docs/godmode_setup/START_GODMODE.ps1)
- [aider_godmode.ps1](/d:/Web/docs/godmode_setup/aider_godmode.ps1)
- [STACK_OPERATIONS.md](/d:/Web/docs/godmode_setup/STACK_OPERATIONS.md)
