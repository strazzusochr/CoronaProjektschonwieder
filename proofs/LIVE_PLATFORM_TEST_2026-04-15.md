# Live Platform Test Report (2026-04-15)

## Scope
- Runtime endpoint checks against `http://127.0.0.1:3901`
- End-to-end API smoke checks for dispatch and autonomy flows
- Frontend control-path validation in `CoronaProjektschonwieder/src/App.tsx`

## Live API Results
- `GET /health`: HTTP 200, core routing targets reachable.
- Frontend dev ports `http://127.0.0.1:5173` and `http://127.0.0.1:4173`: `ERR_CONNECTION_REFUSED` during this run.
- `GET /control-center/state?fresh=true`: `ready_for_prompt_execute=false` with reason tied to `devtools-bridge` probe.
- `POST /dispatch`: HTTP 200, status `forwarded`.
- `POST /prompt/execute`: HTTP 409 (blocked by readiness gate).
- `POST /runs`: HTTP 409 (blocked by readiness gate).
- `POST /autonomy/run`: HTTP 200, status `PASS` (foreground chain completes).
- `POST /bootstrap/start` with `include_script_start=true`: transitions to `BLOCKED` because runtime reports `BOOTSTRAP_ALLOW_SCRIPT_START=false`.

## Fix Applied
### Frontend Autonomy Fallback Unblocked
File: `CoronaProjektschonwieder/src/App.tsx`

Problem:
- `runAutonomyPipeline()` returned early when `readyForPromptExecution` was false.
- This prevented users from reaching the already-implemented `/runs -> /autonomy/run` fallback path.

Change:
- Removed the early `return` and kept an informational message.
- Result: Autonomy button path can proceed and hit backend fallback logic even while bootstrap readiness is false.

## Important Runtime Finding
- Local source includes readiness hardening logic, but the running hub still behaves as if older config/runtime is active.
- Runtime state indicates one-click bootstrap is still disabled (`BOOTSTRAP_ALLOW_SCRIPT_START=false`) and devtools bridge is treated as a blocking probe in the active container process.

## Current Functional Status
- Dispatch path: working.
- Direct autonomy path: working.
- Prompt execute and runs path: blocked by active runtime readiness gate (server-side state/config in running instance).
- Frontend autonomy flow: fixed to avoid local UI self-blocking and to allow fallback execution path.

## Next Required Runtime Step
- Reload/restart the running hub stack so active process picks up current source/config.
- Re-run the same smoke set to confirm `ready_for_prompt_execute=true` when only optional probes fail.
