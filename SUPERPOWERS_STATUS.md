# GODMODE Superpowers Status

Stand: 2026-04-11 (Audit-Snapshot)

Primary evidence:
- `.godmode_runtime/evidence/superpowers_audit_latest.json`
- last strict score: `12/12 VERIFIED (100.0%)`
- last operational score: `12/12 (100.0%)`

Important scope note:
- This file reports **repo-local/runtime-local superpower verification**.
- External/private services (for example hosted bolt/Oracle/private HF targets) keep their own `BLOCKED/NOT VERIFIED` tracking in forensic/runtime docs.

| Superpower | Status | Evidence |
| --- | --- | --- |
| 1. OpenHands Architect Mode | `VERIFIED` | `openhands/adapter.py` mission contract + local adapter health + `/trigger` runtime proof in `superpowers_audit_latest.json`. |
| 2. Aider Ultracheap | `VERIFIED` | `aider_godmode.ps1` defaults include `--architect`, weak-model editor path, and auto-lint map workflow. |
| 3. smolagents Web-Crawler | `VERIFIED` | `hf_smolagents/app.py` includes `DuckDuckGoSearchTool`, `VisitWebpageTool`, manager/web/code agent wiring. |
| 4. LangGraph Self-Evolving | `VERIFIED` | `langgraph/system.py` + live `POST /run` proof with prompt-evolution path in audit snapshot. |
| 5. n8n Phantom Trigger | `VERIFIED` | canonical mission webhook `POST /webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission` responds `200` in audit snapshot. |
| 6. OpenHands + bolt.diy Feedback Loop | `VERIFIED` | local hybrid dispatch path `bolt-facade -> n8n -> openhands-adapter` forwarded and logged in snapshot; external hosted bolt remains separate track. |
| 7. LiteLLM Router | `VERIFIED` | live router checks for `/`, `/health`, `/v1/models` with authenticated runtime evidence. |
| 8. Aider Repo-Map | `VERIFIED` | `aider_godmode.ps1` includes repo-map token sizing + forced map refresh. |
| 9. Vision Agent | `VERIFIED` | `hf_smolagents/app.py` contains `VisualDebugTool` and guarded screenshot-analysis behavior. |
| 10. Parallele Agent-Swarms | `VERIFIED` | `langgraph/system.py` uses `ThreadPoolExecutor(max_workers=3)` for parallel branch execution. |
| 11. n8n AI Memory | `VERIFIED` | `n8n_memory_probe_workflow.json` imported + executed; memory append proof captured in audit snapshot and `memory_vault.md`. |
| 12. Context Window Injection | `VERIFIED` | shared `GODMODE_CONTEXT` injection verified in `langgraph/system.py` and `hf_smolagents/app.py`. |

Hosted note:
- Historical `Wrzzzrzr/aider-web-ide` stays paused (`LEGACY` due old ttyd abuse flag).
- Canonical hosted Aider surface is `Wrzzzrzr/aider-godmode-safe`.
