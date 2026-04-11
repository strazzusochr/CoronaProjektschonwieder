# Hetzner Selfhosted Deploy Runbook

Stand: 2026-04-11

This runbook documents the canonical remote deployment path for the active
selfhosted core runtime target on Hetzner.

## Target

- Host: `65.108.253.14`
- Runtime profile: `selfhosted`
- Oracle profile: `PLACEHOLDER` / `NOT ACTIVE`

## Canonical Command

```powershell
.\ops\deploy_hetzner_core.ps1 `
  -HostIp 65.108.253.14 `
  -SshUser root `
  -FqdnRoot <fqdn-root> `
  -TlsEmail <tls-email>
```

Optional:

- `-SshKeyPath <path>`
- `-SshPassword <local-only-password>` plus `-SshHostKey "<ssh-ed25519 ...>"`
- `-Branch <git-branch>`
- `-RemotePath /opt/godmode_setup`
- `-SkipRemoteApply` (preflight-only)

## What The Deploy Script Does

1. SSH preflight and public port inventory.
2. Remote bootstrap:
   - Docker Engine + Compose plugin
   - Nginx + Certbot
   - UFW hardening
3. Repo sync to `/opt/godmode_setup` (`main` by default).
4. Server-side `.godmode_env` rendering for selfhosted profile.
5. Core startup via `START_GODMODE.sh`.
6. Nginx reverse proxy for:
   - `openhands.<fqdn>`
   - `adapter.<fqdn>`
   - `langgraph.<fqdn>`
   - `n8n.<fqdn>`
   - `bolt.<fqdn>`
7. Let's Encrypt certificate issuance and redirect enablement.
8. Local and remote evidence snapshot write.

## Security Contract

- Publicly reachable: `22`, `80`, `443`
- Blocked externally: `3000`, `3001`, `3901`, `4000`, `5678`, `8080`, `11434`,
  `4173`
- Service-to-service communication remains internal to host/docker networking.

## Evidence Files

Local:

- `.godmode_runtime/evidence/hetzner_preflight_latest.json`
- `.godmode_runtime/evidence/hetzner_deploy_latest.json`

Remote:

- `/opt/godmode_setup/.godmode_runtime/evidence/hetzner_remote_latest.json`

Last verified local snapshot:

- `.godmode_runtime/evidence/hetzner_deploy_latest.json` (2026-04-11)
  - `status=PASS`
  - all 5 HTTPS endpoints `200`
  - service ports externally closed

## Failure Classification

- `PASS`: rollout, TLS, and checks complete.
- `BLOCKED`: SSH auth, DNS/TLS, or remote bootstrap failed.
- `SKIPPED`: preflight-only mode was requested.

## Related Files

- [ops/deploy_hetzner_core.ps1](/d:/Web/docs/godmode_setup/ops/deploy_hetzner_core.ps1)
- [SELFHOSTED_CORE_RUNTIME_BETA_RUNBOOK.md](/d:/Web/docs/godmode_setup/SELFHOSTED_CORE_RUNTIME_BETA_RUNBOOK.md)
- [ORACLE_DUAL_TRACK_RUNBOOK.md](/d:/Web/docs/godmode_setup/ORACLE_DUAL_TRACK_RUNBOOK.md)
