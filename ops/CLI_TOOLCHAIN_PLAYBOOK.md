# CLI Toolchain Playbook

## Scope

Use one consistent CLI stack for push/sync and autonomous release operations.

## Official CLI Docs

- Hetzner Cloud CLI (`hcloud`): https://community.hetzner.com/tutorials/howto-hcloud-cli
- GitHub CLI (`gh`): https://cli.github.com/manual/gh
- Hugging Face Hub CLI (`hf`): https://huggingface.co/docs/huggingface_hub/guides/cli
- Oracle OCI CLI (`oci`): https://github.com/oracle/oci-cli
- GitKraken CLI (`gk`): https://github.com/gitkraken/gk-cli
- Git CLI (`git`): https://git-scm.com/docs/gitcli

## Baseline Health Checks

- `git --version`
- `gh --version`
- `hf --version`
- `hcloud version`
- `oci --version`
- `gk --version`

## Auth Checks

- `gh auth status`
- `hf auth whoami`
- `hcloud context list`
- `oci iam region-subscription list --all`

## Standard Push Flow

1. Run quality gates first:
- `npm --prefix D:\Web\docs\godmode_setup\CoronaProjektschonwieder run verify:release`
- `py -3 -m unittest D:\Web\docs\godmode_setup\bolt_facade\test_control_evidence_api.py D:\Web\docs\godmode_setup\ops\test_runtime_dedupe.py`
- `py -3 D:\Web\docs\godmode_setup\verify_superbrain_merge.py`

2. Push with wrapper:
- `powershell -ExecutionPolicy Bypass -File D:\Web\docs\godmode_setup\ops\PUSH_ALL_SYSTEMS.ps1 -RunPreflight -GitPush -GitHubSync`

3. Optional provider sync checks:
- `... -HuggingFaceSync -HetznerSync -OCISync -GitKrakenSync`

## Notes

- The wrapper never prints tokens.
- Provider-specific deployment commands are intentionally opt-in and can be extended safely per environment.
