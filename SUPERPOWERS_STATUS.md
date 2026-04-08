# GODMODE Superpowers Status

Stand: 2026-04-08

| Superpower | Status | Evidence |
| --- | --- | --- |
| 1. OpenHands Architect Mode | `partial` | OpenHands runtime exists and operator docs now define the contract, but the upstream UI/task preset still depends on operator behavior. |
| 2. Aider Ultracheap | `implemented` | `aider_godmode.ps1` now defaults to architect + weak-model planning + repo-map flags. |
| 3. smolagents Web-Crawler | `implemented` | `hf_smolagents/app.py` includes web research and managed agents. |
| 4. LangGraph Self-Evolving | `implemented` | `langgraph/system.py` persists prompt evolution to `prompt_evolution.json`. |
| 5. n8n Phantom Trigger | `partial` | `n8n_mission_workflow.json` defines webhook-triggered mission intake, pending live import and operator hookup. |
| 6. OpenHands + bolt.diy Feedback Loop | `partial` | `BOLTDIY_EXTERNAL_INTEGRATION.md` and the mission payload contract define the loop; external bolt.diy service remains outside this repo. |
| 7. LiteLLM Router | `implemented` | `litellm_config.yaml` and `.godmode_env.example` define the secret-safe smart router contract. |
| 8. Aider Repo-Map | `implemented` | `aider_godmode.ps1` now defaults to repo-map refresh and high map-token capacity. |
| 9. Vision Agent | `implemented` | `hf_smolagents/app.py` includes `VisualDebugTool`. |
| 10. Parallele Agent-Swarms | `implemented` | `langgraph/system.py` runs a parallel swarm branch using a thread pool. |
| 11. n8n AI Memory | `partial` | `n8n_memory_workflow.json` is now env-safe and writes to `MEMORY_VAULT_PATH`, pending live n8n import. |
| 12. Context Window Injection | `implemented` | `langgraph/system.py` and `hf_smolagents/app.py` inject shared GODMODE context. |
