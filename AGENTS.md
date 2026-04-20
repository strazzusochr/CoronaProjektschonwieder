# AGENTS.md

## Runtime Workflows (verified)

- Full release verification:
  `npm --prefix D:\Web\docs\godmode_setup\CoronaProjektschonwieder run verify:release`

- Backend verification:
  `py -3 -m unittest D:\Web\docs\godmode_setup\bolt_facade\test_control_evidence_api.py D:\Web\docs\godmode_setup\ops\test_runtime_dedupe.py`

- Superbrain gate verification:
  `py -3 D:\Web\docs\godmode_setup\verify_superbrain_merge.py`

- Superbrain gate stabilization (timeout-sensitive environments):
  `set SUPERBRAIN_DISPATCH_TIMEOUT=90`
  `set SUPERBRAIN_OPENHANDS_DISPATCH_TIMEOUT=180`
  `set SUPERBRAIN_EXTERNAL_DISPATCH_TIMEOUT=360`
  `set SUPERBRAIN_DISPATCH_RETRIES=3`
  `set SUPERBRAIN_EXTERNAL_DISPATCH_RETRIES=4`
  `set SUPERBRAIN_DISPATCH_RETRY_DELAY_SECONDS=2.0`
  `set SUPERBRAIN_INVENTORY_MAX_WORKERS=3`
  then run:
  `py -3 D:\Web\docs\godmode_setup\verify_superbrain_merge.py`

- Routing mode control:
  `POST http://127.0.0.1:3902/routing/override` with `mode=auto|local|remote`.

- Bootstrap health-only check:
  `POST http://127.0.0.1:3902/bootstrap/start` with `include_script_start=false`,
  then `GET http://127.0.0.1:3902/bootstrap/status`.

- Vercel production deploy verification:
  `npx vercel ls corona-projektschonwieder --scope strazzusochrs-projects`
  `npx vercel inspect corona-projektschonwieder.vercel.app --logs`

- Runtime reload after backend changes:
  `docker restart bolt-facade-godmode`

- Verified-only maturity check:
  `Invoke-RestMethod http://127.0.0.1:3902/agents | ConvertTo-Json -Depth 50`
  Ensure no `status_class: IMPLEMENTED` appears in output.

## Operational Note

- Bootstrap can remain `PARTIAL` when n8n memory probe webhook returns `404`.
- Maturity end-state is `Verified`; `Implemented` is treated as legacy input and normalized to `Verified`.
- TODO: Confirm n8n workflow `godmodeMemoryProbe01` is active before requiring bootstrap `READY`.
