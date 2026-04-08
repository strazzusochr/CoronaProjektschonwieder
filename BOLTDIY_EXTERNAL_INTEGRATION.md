# bolt.diy External Integration

Stand: 2026-04-08

`bolt.diy` is intentionally treated as an external canonical Hugging Face
service, not as a local mirror inside this repository.

## Canonical position

- deployment target: `BOLTDIY_SPACE_URL`
- ownership: external HF Space
- local repo responsibility: secret contract, routing, and feedback-loop
  documentation only

## Required env inputs

- `BOLTDIY_SPACE_URL`
- `OPENAI_BASE_URL`
- `OPENROUTER_API_KEY`
- any HF Space secrets needed by the deployed `bolt.diy` Space

## Expected feedback loop

1. `bolt.diy` generates or updates code against the canonical repo.
2. A mission payload enters `n8n` or the pilot loop.
3. `OpenHands` or `Aider` verifies and fixes the result.
4. Browser verification and proof artifacts are recorded in the repo.
5. Updated status is visible again to the operator and external services.

## Related files

- [MISSION_PAYLOAD_CONTRACT.md](/d:/Web/docs/godmode_setup/MISSION_PAYLOAD_CONTRACT.md)
- [STACK_OPERATIONS.md](/d:/Web/docs/godmode_setup/STACK_OPERATIONS.md)
- [STACK_GAP_ROADMAP.md](/d:/Web/docs/godmode_setup/STACK_GAP_ROADMAP.md)
