# n8n Local Automation Engine

This directory contains the canonical local n8n runtime for GODMODE
automation.

## Current workflow artifacts

- `../n8n_memory_workflow.json`: env-safe memory sync
- `../n8n_mission_workflow.json`: webhook-based mission intake

## Expected env inputs

- `N8N_BASIC_AUTH_USER`
- `N8N_BASIC_AUTH_PASSWORD`
- `N8N_ENCRYPTION_KEY`
- `N8N_EDITOR_BASE_URL`
- `N8N_WEBHOOK_URL`
- `MEMORY_VAULT_PATH`

## Related files

- `docker-compose.yml`
- `../MISSION_PAYLOAD_CONTRACT.md`
- `../STACK_OPERATIONS.md`
