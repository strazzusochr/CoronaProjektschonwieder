# LangGraph Local Orchestrator

This directory contains the canonical local LangGraph engine for the GODMODE
stack.

## Implemented orchestration path

- planner node
- parallel swarm node
- reviewer node
- meta-optimizer node with prompt evolution persistence
- final response assembly

## APIs

- `GET /health`
- `POST /run`
- `POST /execute` (compatibility alias)

## Related files

- `system.py`
- `../SUPERPOWERS_STATUS.md`
- `../MISSION_PAYLOAD_CONTRACT.md`
