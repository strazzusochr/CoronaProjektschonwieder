# AGENTS.md

## Runtime Workflows (verified)

- Full release verification:
  `npm --prefix D:\Web\docs\godmode_setup\CoronaProjektschonwieder run verify:release`

- Final build acceptance verification:
  `py -3 D:\Web\docs\godmode_setup\run_final_build_test.py`

- Backend verification:
  `py -3 -m unittest D:\Web\docs\godmode_setup\bolt_facade\test_control_evidence_api.py D:\Web\docs\godmode_setup\ops\test_runtime_dedupe.py`

- Bolt facade API/dispatch/proof smoke:
  `py -3 D:\Web\docs\godmode_setup\verify_bolt_facade.py`

- End-to-end flow verification (Flows A-E):
  `py -3 D:\Web\docs\godmode_setup\verify_e2e_flows.py`

- Hugging Face runtime gate verification:
  `py -3 D:\Web\docs\godmode_setup\verify_hf_runtime.py`

- DevTools bridge verification:
  `py -3 D:\Web\docs\godmode_setup\verify_devtools_bridge.py`

- Superpowers audit:
  `py -3 D:\Web\docs\godmode_setup\verify_superpowers.py`

- Security rotation preflight:
  `py -3 D:\Web\docs\godmode_setup\security_preflight.py`
  `py -3 -m unittest D:\Web\docs\godmode_setup\test_security_preflight.py`

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

- Memory protocol (mandatory before major runs):
  `powershell -ExecutionPolicy Bypass -File D:\Web\docs\godmode_setup\ops\READ_MEMORY_PROTOCOL_5X.ps1 -Mission "your mission"`

- Codex verified-only bind prompt:
  `D:\Web\docs\godmode_setup\PROMPTS\CODEX_SUPERBRAIN_VERIFIED_ONLY_PROMPT_2026-04-20.md`

## CLI Toolchain (system-wide)

- Unified CLI wrapper (push + auth checks + provider sync stubs):
  `powershell -ExecutionPolicy Bypass -File D:\Web\docs\godmode_setup\ops\PUSH_ALL_SYSTEMS.ps1 -RunPreflight -GitPush -GitHubSync`

- CLI playbook (commands + links):
  `D:\Web\docs\godmode_setup\ops\CLI_TOOLCHAIN_PLAYBOOK.md`

- Official references:
  `https://community.hetzner.com/tutorials/howto-hcloud-cli`
  `https://cli.github.com/manual/gh`
  `https://huggingface.co/docs/huggingface_hub/guides/cli`
  `https://github.com/oracle/oci-cli`
  `https://github.com/gitkraken/gk-cli`
  `https://git-scm.com/docs/gitcli`

## Operational Note

- Bootstrap can remain `PARTIAL` when n8n memory probe webhook returns `404`.
- Maturity end-state is `Verified`; `Implemented` is treated as legacy input and normalized to `Verified`.
- TODO: Promote sentinel runtime probe only after `D:\Web\docs\godmode_setup\proofs\sentinel_runtime_probe_latest.json` has no `FAIL` rows or blockers.
- TODO: Confirm n8n workflow `godmodeMemoryProbe01` is active before requiring bootstrap `READY`.
