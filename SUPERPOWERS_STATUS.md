# GODMODE Superpowers Status

Stand: 2026-04-09

| Superpower | Status | Evidence |
| --- | --- | --- |
| 1. OpenHands Architect Mode | `partial` | OpenHands runtime exists locally, `hf_openhands/` is now deployed live to `wrzzzrzr-openhands-godmode.hf.space`, and the hosted wrapper answers HTTP `200`; the upstream UI/task preset still depends on operator behavior. |
| 2. Aider Ultracheap | `implemented` | `aider_godmode.ps1` now defaults to architect + weak-model planning + repo-map flags, uses the current official Docker image, and the new safe HF surface is deployed at `wrzzzrzr-aider-godmode-safe.hf.space`. |
| 3. smolagents Web-Crawler | `implemented` | `hf_smolagents/app.py` now boots against the current `smolagents` API, installs from the trimmed core requirements, exposes a runnable local Gradio UI, and is deployed as `wrzzzrzr-smolagents-godmode.hf.space`. |
| 4. LangGraph Self-Evolving | `implemented` | `langgraph/system.py` persists prompt evolution to `prompt_evolution.json`. |
| 5. n8n Phantom Trigger | `partial` | `n8n_mission_workflow.json` defines webhook-triggered mission intake, pending live import and operator hookup. |
| 6. OpenHands + bolt.diy Feedback Loop | `partial` | `BOLTDIY_EXTERNAL_INTEGRATION.md` and the mission payload contract define the loop; external bolt.diy service remains outside this repo. |
| 7. LiteLLM Router | `implemented` | `litellm_config.yaml` and `.godmode_env.example` define the secret-safe smart router contract. |
| 8. Aider Repo-Map | `implemented` | `aider_godmode.ps1` now defaults to repo-map refresh and high map-token capacity. |
| 9. Vision Agent | `implemented` | `hf_smolagents/app.py` includes `VisualDebugTool`, and the missing-screenshot error path is locally verified instead of crashing. |
| 10. Parallele Agent-Swarms | `implemented` | `langgraph/system.py` runs a parallel swarm branch using a thread pool. |
| 11. n8n AI Memory | `partial` | `n8n_memory_workflow.json` is now env-safe and writes to `MEMORY_VAULT_PATH`, pending live n8n import. |
| 12. Context Window Injection | `implemented` | `langgraph/system.py` and `hf_smolagents/app.py` inject shared GODMODE context. |

Hosted note: the historical `Wrzzzrzr/aider-web-ide` Space remains paused by a
legacy Hugging Face abuse flag tied to the old `ttyd` variant. The canonical
hosted Aider surface is now `Wrzzzrzr/aider-godmode-safe`.
