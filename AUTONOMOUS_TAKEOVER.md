# Autonomous Takeover Mode

This document defines the active autonomous operating model for this repository.

## Mission

Run a strict multi-agent execution flow with:
- 11 roles total
- 9 specialist builder roles
- 2 supervisor roles with blocking authority
- evidence-first completion policy

## Control Plane

Use `autonomous_control_plane.py` as the canonical runtime controller.

Runtime state files:
- `.godmode_runtime/autonomy/team_state.json`
- `.godmode_runtime/autonomy/task_queue.json`
- `.godmode_runtime/autonomy/control_state.json`
- `.godmode_runtime/autonomy/evidence_log.jsonl`

## Slot Model

- max concurrent slots: 6
- reserved supervisor slots: 2
- builder slots: 4

Supervisors always stay active:
- `SentinelTruthAgent`
- `SentinelRuntimeAgent`

## Hard Gates

A task can only pass when both supervisor gates pass:

1. Truth gate
- no schema violations
- valid claim labels (`verified`, `inferred`, `unknown`)
- no `unknown` claims in a `completed` update

2. Runtime gate
- completed tasks require tests with `passed=true`
- UI/gameplay tasks require browser evidence
- UI/gameplay tasks require both tools in evidence: `chrome-devtools`, `puppeteer`

If any gate fails, task status is forced to `blocked`.

## Standard Commands

```bash
python autonomous_control_plane.py init
python autonomous_control_plane.py queue-task --task-id T-001 --owner-role ProductScopeAgent --title "Define milestone map" --impact docs --description "Create release slices"
python autonomous_control_plane.py status
python autonomous_control_plane.py ingest-update --file .godmode_runtime/autonomy/inbox/update_template.json
python autonomous_control_plane.py rotate
python autonomy_supervisor_loop.py --once
python autonomy_supervisor_loop.py --interval 60
```

## One-Click Runner

PowerShell (Windows):

```powershell
.\\ops\\RUN_FULLY_AUTONOMOUS.ps1 -StartStack -Loop -LoopIntervalSeconds 60
```

Shell (Linux/selfhosted):

```bash
START_STACK=1 SUPERVISOR_LOOP=1 SUPERVISOR_INTERVAL_SECONDS=60 ./ops/RUN_FULLY_AUTONOMOUS.sh
```

## Required Update Payload Shape

Use JSON payloads with at least:
- `task_id`
- `agent_role`
- `status` (`in_progress|completed|blocked`)
- `impact`
- `claims` (non-empty list with claim labels)

For completed tasks also include:
- `tools_executed`
- `tests.summary`
- `tests.passed=true`
- `risk_note`
- `rollback_note`

For UI/gameplay tasks also include:
- `browser_checks.snapshot=true`
- `browser_checks.console=true`
- `browser_checks.network=true`

## Immediate Execution Order

1. Initialize control plane
2. Queue one kickoff task per high-priority builder role
3. Ingest updates continuously
4. Let supervisor gates decide pass/block
5. Rotate slots at each phase boundary

## Live Status Snapshot (2026-04-15)

- Active supervisors: `SentinelTruthAgent`, `SentinelRuntimeAgent`
- Active builders: `MultiplayerNetcodeAgent`, `BackendPlatformAgent`, `CloudInfraDevOpsAgent`, `QAValidationAgent`
- Blocked tasks: `T-003`, `T-004` (awaiting runtime/browser/test evidence)
- In-progress tasks: `T-001`, `T-002`, `T-005`, `T-006`, `T-007`, `T-008`
- Queued tasks: `T-009`

## Execution Limitation Note

In this session, direct process execution (`python`, shell) may fail with `CreateProcessAsUserW failed: 5`.
When this occurs:
- keep advancing structured deliverables and gate-state artifacts,
- do not claim runtime checks as completed,
- leave relevant tasks in `blocked` or `in_progress` until executable evidence is available.
