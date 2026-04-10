# Selfhosted Core Runtime Beta Runbook

Stand: 2026-04-10

This runbook defines the minimum operator path for running the GODMODE stack
without Oracle and without pretending that external services are local.

## Goal

- run the active stack as a provider-neutral `selfhosted` core runtime
- keep Hugging Face Spaces as hosted facades where they already exist
- keep Oracle as a future placeholder only

## Beta Runtime Model

Active runtime profiles:

- `local`
- `selfhosted`
- `hf-facade`

Reserved future profile:

- `oracle`

Status of the reserved Oracle profile:

- `PLACEHOLDER`
- `FUTURE PROFILE`
- `NOT ACTIVE`

## Required Inputs For A Real Selfhosted Beta

These values must be supplied by the operator in `.godmode_env`.

### Core runtime selectors

- `CORE_RUNTIME_PROVIDER=selfhosted`
- `CORE_RUNTIME_MODE=selfhosted`
- `CORE_RUNTIME_HOST=<real host or DNS>`
- `CORE_RUNTIME_PUBLIC_URL=<real base URL>`
- `CORE_RUNTIME_SSH_HOST=<real SSH host if remote shell access is needed>`
- `CORE_DOCKER_CONTEXT=<docker context name or default>`
- `CORE_DEPLOY_PROFILE=selfhosted`

### Core services

- `OPENHANDS_PUBLIC_URL`
- `OPENHANDS_API_URL`
- `OPENHANDS_ADAPTER_URL`
- `LANGGRAPH_API_URL`
- `N8N_WEBHOOK_BASE_URL`
- `N8N_WEBHOOK_URL`
- `N8N_EDITOR_BASE_URL`

### Credentials still required

- provider keys for the chosen model backend
- `GITHUB_TOKEN`
- `HF_TOKEN` for hosted Space operations when needed
- `N8N_BASIC_AUTH_USER`
- `N8N_BASIC_AUTH_PASSWORD`
- `N8N_ENCRYPTION_KEY`

## What Is Already Good Enough For Beta

- the root startup scripts are provider-neutral and do not require Oracle
- `CoronaProjektschonwieder` is build- and browser-proven locally
- local `OpenHands`, `OpenHands adapter`, `LangGraph`, and `n8n` have verified
  health paths
- Hugging Face Spaces remain valid hosted facades for `OpenHands`,
  `LangGraph`, `smolagents`, `Aider`, and the private pilot

## What Still Depends On External Operators

- real remote DNS / IP / TLS values for a non-local `selfhosted` profile
- actual remote SSH access if the core runtime is not on the local machine
- hosted `bolt.diy`, which remains an external dependency
- optional LiteLLM live proxy if the operator wants cost-based routing instead
  of direct provider URLs

## Minimum Bring-Up Sequence

1. Copy `.godmode_env.example` to `.godmode_env`.
2. Replace the selfhosted example hostnames with real reachable values.
3. Keep Oracle disabled:
   - `ORACLE_ENABLED=false`
   - `ORACLE_PLACEHOLDER=true`
   - `ORACLE_RESERVED_FOR_FUTURE=true`
4. Start the core runtime:
   - Windows: `powershell -File START_GODMODE.ps1`
   - Linux/selfhosted: `bash ./START_GODMODE.sh`
5. Verify health:
   - `GET /health` on `OpenHands adapter`
   - `GET /health` on `LangGraph`
   - `GET /healthz` on `n8n`
6. Verify the frontend:
   - `npm test`
   - `npm run build`
   - `npm run test:browser`

## Beta Gate Interpretation

- `VERIFIED`: local runtime and browser proof are green
- `PARTIAL`: hosted and external modules exist, but still depend on operator
  infrastructure or external accounts
- `NOT VERIFIED`: any remote host or service that is configured only as a
  placeholder and was not actually reached from this repo state

## Non-Blocking External Modules

- `bolt.diy`: external-only by design for this beta
- full LangGraph multi-agent expansion beyond the current planner/swarm/review
  flow
- live LiteLLM proxy runtime
- PM2 process supervision

## Related Files

- [`.godmode_env.example`](/d:/Web/docs/godmode_setup/.godmode_env.example)
- [ENV_REFERENCE.md](/d:/Web/docs/godmode_setup/ENV_REFERENCE.md)
- [STACK_GAP_ROADMAP.md](/d:/Web/docs/godmode_setup/STACK_GAP_ROADMAP.md)
- [STACK_OPERATIONS.md](/d:/Web/docs/godmode_setup/STACK_OPERATIONS.md)
