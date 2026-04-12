# GODMODE Mission Payload Contract

Stand: 2026-04-08

This is the canonical payload shape for pilot, n8n, OpenHands adapter, and
other mission dispatchers.

## Fields

| Key | Type | Meaning |
| --- | --- | --- |
| `agent` | string | canonical namespaced executor id such as `local.pilot.aider_cloud` or `external.ollamahf.solo_builder` |
| `task` | string | the actual mission text |
| `source` | string | origin system such as `hf_pilot_actual` or `n8n` |
| `repo` | string | canonical repo URL |
| `ref` | string | target branch or ref, usually `main` |
| `status` | string | mission state such as `triggered`, `queued`, `accepted` |
| `timestamp` | string | ISO-8601 UTC timestamp |

## Example

```json
{
  "agent": "local.pilot.aider_cloud",
  "task": "Implement the current GODMODE mission end-to-end and verify it.",
  "source": "hf_pilot_actual",
  "repo": "https://github.com/strazzusochr/CoronaProjektschonwieder",
  "ref": "main",
  "status": "triggered",
  "timestamp": "2026-04-08T18:00:00Z"
}
```

## Current Implementations

- [payload.json](/d:/Web/docs/godmode_setup/payload.json)
- [bolt_facade/app.py](/d:/Web/docs/godmode_setup/bolt_facade/app.py)
- [hf_pilot_actual/app.py](/d:/Web/docs/godmode_setup/hf_pilot_actual/app.py)
- [openhands/adapter.py](/d:/Web/docs/godmode_setup/openhands/adapter.py)
- [n8n_mission_workflow.json](/d:/Web/docs/godmode_setup/n8n_mission_workflow.json)
- [agent_registry.json](/d:/Web/docs/godmode_setup/agent_registry.json)
