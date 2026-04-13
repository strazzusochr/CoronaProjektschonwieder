# FINAL_PROOF.md

## Verification Summary

## Truth Override 2026-04-13

- Diese Datei enthaelt historische PASS-Proofs aus frueheren Runs.
- Aktueller Final-Release-Stand ist **nicht** voll geschlossen:
  - `superbrain_gate_latest.json`: `beta_core=100%`, `ga_full=100%`, `beta_core_go=true`, `ga_full_go=true`
  - `e2e_flows_ae_latest.json`: `flow_percent=100%` (`5/5`), `flow_percent_core=100%` (`5/5`)
  - `final_build_test_result.json`: `status=PASS` (`core_status=PASS`, `full_status=PASS`)
  - `security_rotation_check_latest.json`: `status=PARTIAL` (Rotation-Acks fehlen)
- Verbindliche Wahrheit fuer den aktuellen Abschlusslauf: `release_gap_report.json` und die neuesten Evidence-JSONs.

- Repository verified: `D:\Web\docs\godmode_setup`
- Frontend project verified: `D:\Web\docs\godmode_setup\CoronaProjektschonwieder`
- Last fully reverified pushed platform snapshot during this proof: `62c5baa900a44203481c31dec00c87d33ee79db3`
- Verification date: `2026-04-11`
- Scope of this proof: record the successful local validation of the refreshed frontend proof, local stack runtime proof, local n8n hardening proof, restored Hugging Face owner-auth, private pilot resynchronization, and the provider-neutral core-runtime migration that keeps Oracle only as a disabled future profile

## Local Repairs Included In This Proof

1. Removed the stray trailing Markdown fence from `CoronaProjektschonwieder/index.html`.
2. Updated `.godmode_env.example` so `HF_AIDER_SPACE_URL` points to the current canonical hosted target `Wrzzzrzr/aider-godmode-safe` instead of the retired `aider-web-ide`.
3. Extended `.gitignore` to ignore the generated file `CoronaProjektschonwieder/dev.err`.
4. Fixed `n8n_mission_workflow.json` so the webhook is explicitly wired for `POST`.
5. Replaced the unsupported `n8n-nodes-base.executeCommand` node in `n8n_memory_workflow.json` with a `code` node that appends directly to the mounted memory vault file.
6. Added `n8n_memory_probe_workflow.json` as a manual proof workflow for the same memory pipeline.
7. Hardened `n8n/docker-compose.yml` for local cross-compose routing and file persistence:
   - `OPENHANDS_API_URL` default -> `http://openhands-godmode:3000`
   - `OPENHANDS_ADAPTER_URL` default -> `http://openhands-godmode-adapter:3001`
   - `LANGGRAPH_API_URL` default -> `http://langgraph-godmode-local:8080`
   - `MEMORY_VAULT_PATH` default -> `/workspace/memory_vault.md`
   - added `NODE_FUNCTION_ALLOW_BUILTIN=fs,path`
   - added `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`
   - added shared external network `godmode_core`
   - mounted `../memory_vault.md:/workspace/memory_vault.md`
8. Startup scripts now enforce n8n mission workflow import + publish + restart
   + webhook smoke on every stack bring-up.
9. Added `verify_superpowers.py` as strict local 12-superpower runtime gate.
10. Startup scripts now enforce n8n memory-probe workflow import + execute and
    require a `"status":"saved"` marker.

## Validation Commands

### Frontend

Executed in:

```text
D:\Web\docs\godmode_setup\CoronaProjektschonwieder
```

Commands:

```text
npm run test
npm run build
npm run test:browser
```

### Local Stack Runtime

Executed from:

```text
D:\Web\docs\godmode_setup
```

Commands:

```text
powershell -ExecutionPolicy Bypass -File .\START_GODMODE.ps1
docker exec n8n-godmode n8n import:workflow --input=/backups/n8n_mission_workflow.json
docker exec n8n-godmode n8n import:workflow --input=/backups/n8n_memory_workflow.json
docker exec n8n-godmode n8n import:workflow --input=/backups/n8n_memory_probe_workflow.json
curl -X POST http://127.0.0.1:5678/webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission ...
docker compose run --rm n8n execute --id godmodeMemoryProbe01 --rawOutput
py -3 verify_superpowers.py
```

## Validation Results

### Unit Tests

```text
RUN  v4.1.3 D:/Web/docs/godmode_setup/CoronaProjektschonwieder
Test Files  2 passed (2)
Tests       2 passed (2)
```

### Production Build

```text
vite v8.0.7 building client environment for production...
✓ 585 modules transformed.
dist/index.html
dist/assets/index-DoL1T68A.css
dist/assets/rolldown-runtime-Dw2cE7zH.js
dist/assets/SceneCanvas-BvgSEEDf.js
dist/assets/drei-vendor-C87wyt7E.js
dist/assets/index-7u4K4ECp.js
dist/assets/three-helpers-Y_yBKcCt.js
dist/assets/fiber-vendor-BjfU_CyU.js
dist/assets/react-vendor-CUFyD8B1.js
dist/assets/three-core-B-kyEBkQ.js
✓ built in 768ms
```

Build note:

- The build remains successful.
- A large chunk size warning for `three-core-B-kyEBkQ.js` remains, but this is not a build failure.

### Browser Proof

```text
Running 1 test using 1 worker
ok 1 tests\app.spec.ts:3:1 › renders the mission UI without browser errors
1 passed
```

Artifact timestamps:

- `test-results/browser-smoke.png` updated at `2026-04-10 09:22:15`
- `test-results/.last-run.json` updated at `2026-04-10 09:22:16`

### Local Stack Health

```text
OpenHands -> http://127.0.0.1:3000 (200)
OpenHands Adapter -> http://127.0.0.1:3001/health (200)
LangGraph -> http://127.0.0.1:8080/health (200)
n8n -> http://127.0.0.1:5678/healthz (200)
```

### n8n Mission Intake Proof

```text
HTTP/1.1 200 OK
POST /webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission
```

Observed runtime side effect:

- `openhands-godmode-adapter` logged `POST /trigger HTTP/1.1" 200 OK` after the verified n8n mission call.

### n8n Memory Pipeline Proof

Manual proof workflow:

```text
godmodeMemoryProbe01 | GODMODE AI Memory Probe
```

Successful execution facts:

- `Fetch Runtime Health` -> success
- `Shape Memory Entry` -> success
- `Save to Memory Vault` -> success
- saved path: `/workspace/memory_vault.md`
- saved bytes: `112`

Memory vault growth:

```text
BEFORE=2026-04-10T09:24:10.1002036+02:00|875
AFTER=2026-04-10T09:55:15.2038860+02:00|987
```

### Superpowers Gate Proof

```text
py -3 verify_superpowers.py
summary: VERIFIED=12, PARTIAL=0, BLOCKED=0, NOT VERIFIED=0
strict_percent_verified_only=100.0
operational_percent_verified_plus_partial=100.0
verdict=PASS
```

## Outcome

- The frontend local proof is current again.
- The local Docker-based GODMODE core stack is now materially proven on Windows.
- `index.html` is syntactically clean and no longer contains the stray trailing fence.
- The canonical Aider hosted URL in the shared environment template now points at the safe space.
- The proof now reflects current Vite, Vitest, Playwright and dist artifact state.
- Local n8n mission intake and local memory append are both now concretely evidenced.
- The local superpower gate is now fully audited at `12/12 VERIFIED` with
  dedicated evidence in `.godmode_runtime/evidence/superpowers_audit_latest.json`.
- HF owner-auth is restored to `Wrzzzrzr`.
- The private pilot space is reachable again with authenticated `/health`, reports `status=healthy`, runs on Space SHA `4155ac58e5beb277eea3f352241ccd7e3857341d`, and during the latest authenticated recheck mirrored the last fully reverified GitHub `main` snapshot `62c5baa900a44203481c31dec00c87d33ee79db3`.
- The reserved Oracle host remains externally unreachable from this machine; `Test-Connection` to `132.145.225.182` is `False`, TCP probes to ports `22`, `3000`, `3001`, `4000`, `5678`, `8080`, and `11434` all time out, and a short traceroute reaches `140.91.199.85` before timing out upstream of the host. This is now recorded as a future-profile note, not an active blocker for the provider-neutral beta path.
- Local n8n mission dispatch is now proven again after hardening the runtime:
  the webhook node was renamed to ASCII-stable `mission-webhook`, the env was
  split into `N8N_WEBHOOK_BASE_URL` versus `N8N_WEBHOOK_URL`, and
  `POST /webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission`
  returned HTTP `200` on 2026-04-10.

## Remaining Non-Local Blockers

This proof does **not** verify:

- future Oracle profile reactivation on a remote host

Additional caution that remains outside a clean beta-go:

- `Wrzzzrzr/godmode-pilot-v2` remains not found / not verified
- the reserved Oracle future profile remains unreachable from this machine: ping is `False`, ports `22`, `3000`, `3001`, `4000`, `5678`, `8080`, and `11434` time out against `132.145.225.182`
- the reserved Oracle host remains externally unreachable: ICMP and direct TCP probes to
  `132.145.225.182` still timed out on 2026-04-10
- local n8n canonical dispatch stays on the concrete registered route
  `/webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission`
  even after automated publish/restart, so operators should keep this exact
  route in dispatch configs

Historical note resolved during this proof:

- the earlier stale private-pilot `goal` / `last_sha` was first cleared by the pilot refresh patch on Space SHA `4155ac58e5be...` and later rechecked again after the root repo advanced to the reverified snapshot `62c5baa900a4...`
- 2026-04-10T18:08:14.011049+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=95ce52c1-c7ea-4bdb-9bf9-825d5caa43c8
- 2026-04-10T18:09:13.577415+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=d3f25305-f01e-4f37-b3c2-c72b925d630b
- 2026-04-10T18:10:53.143784+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=be417511-c385-4ca5-82d7-9e9d0b03b073
- 2026-04-10T18:24:23.016873+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=7a471f42-d639-4a74-a52c-d072de1e7247
- 2026-04-10T23:58:01.267280+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=db87a311-dfdf-4504-9ddd-0ddd0d7a1d6a
- 2026-04-11T00:30:08.260075+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=0cc7600a-e30f-4bc8-b425-2d483dcb2c2d
- 2026-04-11T00:53:15.917436+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=e5e90850-19ef-4824-a9bb-d11e99eedac4
- 2026-04-11T15:59:01.493459+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=f82bb6f4-7014-4b4c-bfdc-e6bf6b29eba5
- 2026-04-11T16:05:35.208791+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=74938300-3431-49bd-9a0e-38a73847d959
- 2026-04-11T16:06:11.020220+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=a52644f8-66ed-4797-be7e-734b1a5199e1
- 2026-04-11T16:11:13.531253+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=333c5fa6-6ecd-42b9-a182-c6ef8c970734
- 2026-04-11T16:12:55.650483+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=dd8d2c85-d614-472c-9965-97db31608c17
- 2026-04-11T16:15:11.985548+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=406875da-369c-498e-bd2d-67bb11f16440
- 2026-04-11T16:15:41.426588+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=fdb33702-4e0f-4f2d-9f6b-fcc85ad66537

## 2026-04-11 Runtime Update (Hetzner Selfhosted)

- Hetzner deploy now completed with `PASS`:
  `.godmode_runtime/evidence/hetzner_deploy_latest.json`
- External HTTPS health checks passed for:
  `openhands`, `adapter`, `langgraph`, `n8n`, `bolt` on
  `*.65.108.253.14.nip.io`.
- Service-port hardening passed: direct external access to
  `3000/3001/3901/4000/5678/8080/11434/4173` is closed.
- Latest bolt facade verification now shows external path forwarded with token
  and local chain `n8n -> openhands-adapter` still forwarded:
  `.godmode_runtime/evidence/bolt_facade_api_latest.json`.
- HF runtime strict gate is currently `PASS` for core + private spaces:
  `.godmode_runtime/evidence/hf_runtime_latest.json`.

Note: Oracle future-profile probe remains a separate track and is now reported
as `SKIPPED` by design in `.godmode_runtime/evidence/oracle_probe_latest.json`
when Oracle is disabled placeholder mode; this is not a blocker for the active
selfhosted core runtime.
- 2026-04-11T16:58:05.948176+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=22abb979-41e5-4f30-afa0-adaf70761304
- 2026-04-11T17:07:41.866813+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=68d03025-118f-47c1-a1b2-122395239729
- 2026-04-11T18:34:52.032692+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=bc82cf97-b44d-4927-be8c-75c11ef0561d
- 2026-04-11T18:40:04.564739+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=62e96cfc-a63c-4a94-8b4d-5763bc6a6890
- 2026-04-11T18:43:56.217045+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=811dd253-86db-41b1-a87d-4d89b5547acc
- 2026-04-12T08:13:59.438187+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=ebb2e6c8-b82d-43f4-ad7b-176c937617f8
- 2026-04-12T08:16:57.935613+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=19bd8038-ea6f-452f-9807-9d0124c32a77
- 2026-04-12T08:18:29.112970+00:00 BOLT_PROOF: result=PASS scenario=bolt-facade-api-smoke proof_id=7520c53e-76dd-4429-a06d-4e0f7f7946da
- 2026-04-12T16:17:09.514918+00:00 BOLT_PROOF: result=PASS scenario=superbrain-hub-smoke proof_id=944c914a-fa50-4575-aec2-abbb9b0f0904
- 2026-04-12T16:21:11.056978+00:00 BOLT_PROOF: result=PASS scenario=superbrain-hub-smoke proof_id=f8b4fcd7-976f-4377-a990-36cebf3dd5af
- 2026-04-12T16:22:10.673014+00:00 BOLT_PROOF: result=PASS scenario=superbrain-hub-smoke proof_id=33188456-e92e-4c29-b6fb-d09179df7e1a
- 2026-04-12T16:27:07.420404+00:00 BOLT_PROOF: result=PASS scenario=superbrain-hub-smoke proof_id=21664e1f-84ec-48c6-b145-1e9ebab362dd
- 2026-04-12T16:33:46.699612+00:00 BOLT_PROOF: result=PASS scenario=superbrain-hub-smoke proof_id=48d1c7ef-90f6-4f36-a3d4-45dc51002317
- 2026-04-12T16:41:30.363745+00:00 BOLT_PROOF: result=PASS scenario=superbrain-hub-smoke proof_id=9c6292a9-210b-4cd9-99b0-32f59330b609
- 2026-04-12T16:44:41.284831+00:00 BOLT_PROOF: result=PASS scenario=superbrain-hub-smoke proof_id=1f1a23e3-a03a-4392-be55-0e3f84381371
- 2026-04-12T18:11:09.288536+00:00 BOLT_PROOF: result=PASS scenario=superbrain-hub-smoke proof_id=274a1c68-34cf-4a18-a81e-c85b12f62e8c
- 2026-04-12T20:58:31.529847+00:00 BOLT_PROOF: result=PASS scenario=superbrain-hub-smoke proof_id=77bbb67e-b546-40a6-be2d-deed8dedee1e
- 2026-04-13T01:56:32.193380+00:00 BOLT_PROOF: result=PASS scenario=superbrain-hub-smoke proof_id=843036c8-3c4d-4c41-9b18-04b7663b4ddf
- 2026-04-13T03:25:13.748892+00:00 BOLT_PROOF: result=PASS scenario=superbrain-hub-smoke proof_id=a431ea25-5049-443a-b803-4819bf1e157d
- 2026-04-13T04:17:30.784953+00:00 BOLT_PROOF: result=PASS scenario=superbrain-hub-smoke proof_id=574a1db4-1eb7-4af4-bd01-dff5ba1cc70d
- 2026-04-13T04:56:09.530369+00:00 BOLT_PROOF: result=PASS scenario=superbrain-hub-smoke proof_id=72442bac-e382-4cfd-b661-1c6f6ba7eb01
