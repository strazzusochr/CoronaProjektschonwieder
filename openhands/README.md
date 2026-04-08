# OpenHands Local Runtime

This directory contains the canonical local OpenHands runtime for the GODMODE
stack.

## Components

- `docker-compose.yml`: starts upstream OpenHands plus the stable adapter layer
- `adapter.py`: canonical trigger facade for mission payloads
- `healthcheck.py`: container health probe
- `workspace/`: mounted work area for OpenHands

## Canonical APIs

- OpenHands UI/runtime: `OPENHANDS_PUBLIC_URL`
- OpenHands adapter health: `GET /health`
- OpenHands adapter mission dispatch: `POST /trigger`

## Related files

- `../MISSION_PAYLOAD_CONTRACT.md`
- `../ENV_REFERENCE.md`
- `../STACK_OPERATIONS.md`
