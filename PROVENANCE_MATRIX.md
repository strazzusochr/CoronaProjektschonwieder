# GODMODE Provenance Matrix

Stand: 2026-04-08

This document defines which directories are canonical, which are generated, and
which are archive-only sources.

| Path | Role | Provenance | State |
| --- | --- | --- | --- |
| `godmode_setup/` | control-plane root | hand-maintained orchestration and docs | `canonical` |
| `CoronaProjektschonwieder/` | frontend reference app | hand-maintained runtime project | `canonical` |
| `openhands/` | local OpenHands runtime | hand-maintained local runtime | `canonical` |
| `hf_openhands/` | HF wrapper for OpenHands | hosted wrapper | `canonical` |
| `hf_openhands_clone/` | prior duplicate HF wrapper | duplicate source | `archive-after-salvage` |
| `hf_aider/` | hosted Aider facade | hosted wrapper | `canonical` |
| `hf_smolagents/` | smolagents source | hand-maintained app source | `canonical` |
| `langgraph/` | local LangGraph engine | hand-maintained runtime | `canonical` |
| `hf_langgraph_space/` | HF LangGraph facade | hosted facade | `canonical` |
| `hf_langgraph/` | older LangGraph companion repo | partial duplicate | `archive-after-salvage` |
| `n8n/` | automation engine | hand-maintained local runtime | `canonical` |
| `hf_pilot_actual/` | active pilot | hosted runtime | `canonical` |
| `hf_pilot_clone/` | duplicate pilot source | duplicate source | `archive-after-salvage` |
| `hf_pilot_temp/` | older pilot experiment | legacy source | `archive-after-salvage` |
| `corona_test/` | earlier integration mirror | legacy test mirror | `archive-after-salvage` |
| `GODMODE_BIBLE_V1.html` | guide output | generated artifact | `generated-output` |
| `GODMODE_BIBLE_FINAL.html` | guide output | generated artifact | `generated-output` |

## Rules

- Only `canonical` paths should receive new production-facing implementation work.
- `archive-after-salvage` paths may be inspected for missing knowledge, but they
  are not active operating sources.
- `generated-output` files are not truth sources and must be regenerated from
  canonical inputs if they drift.
