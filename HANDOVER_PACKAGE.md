# HANDOVER_PACKAGE

## Scope
This handover captures the exact, currently verified transfer state for the Godmode/Superbrain workspace so another AI/operator can continue immediately.

## Security Rule
No secret/token values are included here. Only inventory, structure, remotes, branches, commit heads, cleanliness, and required env key names are documented.

## Workspace Roots
- `d:\Web\docs\godmode_setup`
- `d:\Web\docs\antigravity-awesome-skills`

## Verified Repositories

1. Repo: `d:\Web\docs\godmode_setup`
- Remote: `https://github.com/strazzusochr/CoronaProjektschonwieder.git`
- Branch: `main`
- HEAD: `af3d75b`
- Status: `CLEAN`

2. Repo: `d:\Web\docs\godmode_setup\corona_test`
- Remote: `https://github.com/strazzusochr/CoronaProjektschonwieder.git`
- Branch: `main`
- HEAD: `85f648b`
- Status: `CLEAN`

3. Repo: `d:\Web\docs\godmode_setup\hf_aider`
- Remote: `https://huggingface.co/spaces/Wrzzzrzr/aider-godmode-safe`
- Branch: `provider-neutral-safe`
- HEAD: `f6fe7d7`
- Status: `CLEAN`

4. Repo: `d:\Web\docs\godmode_setup\hf_langgraph`
- Remote: `https://huggingface.co/spaces/Wrzzzrzr/langgraph-godmode`
- Branch: `main`
- HEAD: `705ffd7`
- Status: `CLEAN`

5. Repo: `d:\Web\docs\godmode_setup\hf_langgraph_space`
- Remote: `https://huggingface.co/spaces/Wrzzzrzr/langgraph-godmode`
- Branch: `main`
- HEAD: `705ffd7`
- Status: `CLEAN`

6. Repo: `d:\Web\docs\godmode_setup\hf_openhands`
- Remote: `https://huggingface.co/spaces/Wrzzzrzr/openhands-godmode`
- Branch: `main`
- HEAD: `9592c1a`
- Status: `CLEAN`

7. Repo: `d:\Web\docs\godmode_setup\hf_openhands_clone`
- Remote: `https://huggingface.co/spaces/Wrzzzrzr/openhands-godmode`
- Branch: `(detached/empty branch output in check)`
- HEAD: `866093d`
- Status: `CLEAN`

8. Repo: `d:\Web\docs\godmode_setup\hf_pilot_actual`
- Remote: `https://huggingface.co/spaces/Wrzzzrzr/godmode-pilot`
- Branch: `main`
- HEAD: `6d1e6d0`
- Status: `CLEAN`

9. Repo: `d:\Web\docs\godmode_setup\hf_pilot_clone`
- Remote: `https://huggingface.co/spaces/Wrzzzrzr/godmode-pilot`
- Branch: `main`
- HEAD: `6d1e6d0`
- Status: `CLEAN`

10. Repo: `d:\Web\docs\antigravity-awesome-skills`
- Remote: `https://github.com/sickn33/antigravity-awesome-skills`
- Branch: `main`
- HEAD: `2138ff8fd`
- Status: `CLEAN`

## Must-Transfer Paths (1:1)
- `d:\Web\docs\godmode_setup`
- `d:\Web\docs\godmode_setup\.godmode_runtime`
- `d:\Web\docs\godmode_setup\agent_registry.json`
- `d:\Web\docs\godmode_setup\START_GODMODE.ps1`
- `d:\Web\docs\godmode_setup\START_GODMODE.sh`
- `d:\Web\docs\godmode_setup\GODMODE_CONTROL_CENTER.ps1`
- `d:\Web\docs\godmode_setup\bolt_facade`
- `d:\Web\docs\godmode_setup\openhands`
- `d:\Web\docs\godmode_setup\n8n`
- `d:\Web\docs\godmode_setup\langgraph`
- `d:\Web\docs\godmode_setup\litellm`
- `d:\Web\docs\godmode_setup\AGENT_SUPERBRAIN_KONTROLLPROTOKOLL.md`
- `d:\Web\docs\godmode_setup\KONTROLLPROTOKOLL_00_07.md`
- `d:\Web\docs\godmode_setup\STACK_OPERATIONS.md`
- `d:\Web\docs\godmode_setup\GODMODE_FORENSIC_HANDBUCH.html`
- `d:\Web\docs\godmode_setup\verify_superbrain_merge.py`
- `d:\Web\docs\godmode_setup\security_preflight.py`

## Environment Key Inventory (names only, no values)
Source: `d:\Web\docs\godmode_setup\.godmode_env.example`

- `ANTHROPIC_API_KEY`
- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`
- `HF_TOKEN`
- `HF_USERNAME`
- `HF_AIDER_SPACE_URL`
- `HF_OPENHANDS_SPACE_URL`
- `HF_LANGGRAPH_SPACE_URL`
- `HF_SMOLAGENTS_SPACE_URL`
- `HF_PILOT_SPACE_URL`
- `BOLTDIY_SPACE_URL`
- `BOLTDIY_SPACE_ID`
- `HF_VERIFY_STRICT`
- `OLLAMAHF_BASE_URL`
- `OLLAMAHF_MASTER_KEY`
- `OLLAMAHF_BEARER_TOKEN`
- `OLLAMAHF_FORWARD_TIMEOUT`
- `OLLAMAHF_DISPATCH_MAX_TOKENS`
- `OLLAMAHF_CHAT_RECOVERY_MAX_TOKENS`
- `OLLAMAHF_BLOCK_CACHE_SECONDS`
- `OLLAMAHF_DISPATCH_WORKSPACE_FALLBACK`
- `OLLAMAHF_WORKSPACE_TASK_ID`
- `HETZNER_HOST_IP`
- `HETZNER_FQDN_ROOT`
- `HETZNER_TLS_EMAIL`
- `HETZNER_API_TOKEN`
- `GITHUB_TOKEN`
- `GITHUB_USERNAME`
- `GITHUB_REPO`
- `GITHUB_REPO_URL`
- `ROTATED_HETZNER_TOKEN_AT`
- `ROTATED_HF_TOKEN_AT`
- `ROTATED_GITHUB_TOKEN_AT`
- `ROTATED_ROOT_PASSWORD_AT`
- `LITELLM_URL`
- `LITELLM_PORT`
- `LITELLM_API_KEY`
- `OLLAMA_BASE_URL`
- `OPENAI_BASE_URL`
- `MODEL_ROUTER_NAME`
- `BOLTDIY_MODE`
- `BOLTDIY_FACADE_PORT`
- `BOLTDIY_FACADE_URL`
- `BOLTDIY_FACADE_INTERNAL_URL`
- `VITE_GODMODE_HUB_URL`
- `VITE_OPENHANDS_URL`
- `BOLTDIY_FORWARD_TIMEOUT`
- `OPENHANDS_FORWARD_TIMEOUT`
- `CONTROL_CENTER_STATUS_CACHE_TTL`
- `DISPATCH_APPEND_PROJECT_LOGS`
- `BOOTSTRAP_ALLOW_SCRIPT_START`
- `BOOTSTRAP_START_SCRIPT`
- `BOOTSTRAP_COMMAND_TIMEOUT`
- `AGENT_REGISTRY_PATH`
- `HF_AIDER_URL`
- `HF_AIDER_DISPATCH_URL`
- `SMOLAGENTS_URL`
- `SMOLAGENTS_DISPATCH_URL`
- `ZERO_COMPUTE_POLICY`
- `GODMODE_ALLOW_LOCAL_HEAVY`
- `DEVTOOLS_BRIDGE_ENABLED`
- `DEVTOOLS_BRIDGE_HOST`
- `DEVTOOLS_BRIDGE_PORT`
- `DEVTOOLS_BRIDGE_URL`
- `DEVTOOLS_BRIDGE_TIMEOUT`
- `DEVTOOLS_BRIDGE_COMMAND_TIMEOUT`
- `DEVTOOLS_FRONTEND_DIR`
- `CORE_RUNTIME_PROVIDER`
- `CORE_RUNTIME_MODE`
- `CORE_RUNTIME_HOST`
- `CORE_RUNTIME_PUBLIC_URL`
- `CORE_RUNTIME_SSH_HOST`
- `CORE_DOCKER_CONTEXT`
- `CORE_DEPLOY_PROFILE`
- `GODMODE_CORE_NETWORK`
- `LOCAL_HEALTHCHECK_HOST`
- `AIDER_MODEL`
- `AIDER_WEAK_MODEL`
- `AIDER_MAP_TOKENS`
- `OPENHANDS_PORT`
- `OPENHANDS_PUBLIC_URL`
- `OPENHANDS_INTERNAL_URL`
- `OPENHANDS_API_URL`
- `OPENHANDS_API_INTERNAL_URL`
- `OPENHANDS_TRIGGER_URL`
- `OPENHANDS_TRIGGER_MODE`
- `OPENHANDS_TRIGGER_WAIT_SECONDS`
- `OPENHANDS_SOCKET_PATH`
- `SANDBOX_REMOTE_RUNTIME_INIT_TIMEOUT`
- `OPENHANDS_API_KEY`
- `OPENHANDS_ADAPTER_URL`
- `OPENHANDS_ADAPTER_INTERNAL_URL`
- `OPENHANDS_ADAPTER_PORT`
- `OPENHANDS_LLM_MODEL`
- `OPENHANDS_LLM_BASE_URL`
- `OPENHANDS_LLM_MAX_OUTPUT_TOKENS`
- `OPENHANDS_LLM_API_KEY`
- `OPENHANDS_RUNTIME_IMAGE`
- `OPENHANDS_BASE_CONTAINER_IMAGE`
- `OPENHANDS_FILE_STORE`
- `OPENHANDS_FILE_STORE_PATH`
- `OPENHANDS_STATE_HOST_PATH`
- `OPENHANDS_WORKSPACE_HOST_PATH`
- `LANGGRAPH_PORT`
- `LANGGRAPH_API_URL`
- `LANGGRAPH_API_INTERNAL_URL`
- `PROMPT_EVOLUTION_PATH`
- `N8N_BASIC_AUTH_USER`
- `N8N_BASIC_AUTH_PASSWORD`
- `N8N_ENCRYPTION_KEY`
- `N8N_PORT`
- `N8N_API_URL`
- `N8N_API_KEY`
- `N8N_WEBHOOK_BASE_URL`
- `N8N_WEBHOOK_URL`
- `N8N_WEBHOOK_INTERNAL_URL`
- `N8N_MEMORY_PROBE_URL`
- `N8N_EDITOR_BASE_URL`
- `MEMORY_VAULT_PATH`
- `GODMODE_SOURCE`
- `GODMODE_MISSION_AGENT`
- `ORACLE_ENABLED`
- `ORACLE_PLACEHOLDER`
- `ORACLE_RESERVED_FOR_FUTURE`
- `ORACLE_VERIFY_ENABLED`
- `ORACLE_IP`
- `ORACLE_USER`

## Handover Start Sequence (for next AI/operator)
1. Validate runtime safety first:
- Run `security_preflight.py`.
- Confirm rotation acknowledgement fields are present in local `.godmode_env`.

2. Validate orchestration state:
- Run `verify_superbrain_merge.py`.
- Check evidence outputs in `.godmode_runtime/evidence`.

3. Start stack from canonical entrypoint:
- `START_GODMODE.ps1` (Windows) or `START_GODMODE.sh` (Linux).

4. Confirm control-plane health:
- Open/check control endpoints and platform UI.
- Validate prompt dispatch path and runs evidence.

5. Continue implementation only after all checks pass.

## Important Transfer Notes
- Secrets are local/session assets and must never be committed.
- If cloning to another machine, transfer `.godmode_env` securely out-of-band.
- Keep zero-compute policy constraints intact.
- Treat this file as the canonical transfer index for current known state.
