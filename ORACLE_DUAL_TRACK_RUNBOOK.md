# Oracle Dual-Track Runbook

Stand: 2026-04-10

This runbook defines the Oracle verification track as a parallel hard gate
while allowing the HF/selfhosted core beta to close without active Oracle
reachability.

## Gate Model

- Core beta gate (`HF/selfhosted`) may be `GO` even when Oracle is `BLOCKED`.
- Oracle gate is evaluated independently and can be:
  - `PASS`: SSH and at least one runtime port reachable.
  - `BLOCKED`: host unreachable, SSH closed, or runtime ports unavailable.
  - `SKIPPED`: `ORACLE_VERIFY_ENABLED=false`.

## Inputs

- `.godmode_env`:
  - `ORACLE_VERIFY_ENABLED`
  - `ORACLE_ENABLED`
  - `ORACLE_PLACEHOLDER`
  - `ORACLE_IP`
  - `ORACLE_USER`
- Probe script: `oracle_probe.py`

## Execute

```powershell
cd d:\Web\docs\godmode_setup
py -3 oracle_probe.py
```

Expected evidence files:

- `.godmode_runtime/evidence/oracle_probe_latest.json`
- `.godmode_runtime/evidence/oracle_probe_<timestamp>.json`

## Recovery Sequence When BLOCKED

1. Confirm `ORACLE_IP` is not placeholder in `.godmode_env`.
2. Probe SSH manually:
   - `Test-NetConnection <ORACLE_IP> -Port 22`
3. Probe runtime ports manually:
   - `3000`, `3001`, `4000`, `5678`, `8080`, optional `11434`
4. Verify host-side firewall and security lists.
5. Re-run `oracle_probe.py`.

## Reporting Contract

- Never report Oracle as `VERIFIED` without fresh probe evidence JSON.
- Keep Oracle status explicit in docs:
  - `BLOCKED` with reason when probes fail.
  - `PLACEHOLDER` only when profile is intentionally disabled.

