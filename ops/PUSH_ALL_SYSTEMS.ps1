param(
  [string]$RepoRoot = "D:\Web\docs\godmode_setup",
  [string]$Branch = "main",
  [switch]$RunPreflight,
  [switch]$GitPush,
  [switch]$GitHubSync,
  [switch]$HuggingFaceSync,
  [switch]$HetznerSync,
  [switch]$OCISync,
  [switch]$GitKrakenSync
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-Cli {
  param([Parameter(Mandatory = $true)][string]$Name)
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  return $null -ne $cmd
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )
  Write-Host "`n==> $Label"
  & $Action
}

function Invoke-IfCli {
  param(
    [Parameter(Mandatory = $true)][string]$Cli,
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )
  if (Test-Cli $Cli) {
    Invoke-Step -Label $Label -Action $Action
  } else {
    Write-Host "`n[SKIP] $Label (CLI '$Cli' not found)"
  }
}

Invoke-Step -Label "Repository status ($RepoRoot)" -Action {
  git -C $RepoRoot status --short
}

if ($RunPreflight) {
  Invoke-Step -Label "Preflight: verify:release" -Action {
    npm --prefix "$RepoRoot\CoronaProjektschonwieder" run verify:release
  }
  Invoke-Step -Label "Preflight: backend unit" -Action {
    py -3 -m unittest "$RepoRoot\bolt_facade\test_control_evidence_api.py" "$RepoRoot\ops\test_runtime_dedupe.py"
  }
  Invoke-Step -Label "Preflight: superbrain gate" -Action {
    py -3 "$RepoRoot\verify_superbrain_merge.py"
  }
}

if ($GitPush) {
  Invoke-Step -Label "Git push origin/$Branch" -Action {
    git -C $RepoRoot push origin $Branch
  }
}

if ($GitHubSync) {
  Invoke-IfCli -Cli "gh" -Label "GitHub auth/status" -Action {
    gh auth status
    gh repo view
    gh pr status
  }
}

if ($HuggingFaceSync) {
  Invoke-IfCli -Cli "hf" -Label "Hugging Face auth/status" -Action {
    hf auth whoami
    Write-Host "[INFO] Configure optional HF push commands in ops\CLI_TOOLCHAIN_PLAYBOOK.md"
  }
}

if ($HetznerSync) {
  Invoke-IfCli -Cli "hcloud" -Label "Hetzner context/status" -Action {
    hcloud context list
    Write-Host "[INFO] Add project-specific Hetzner deploy commands when required."
  }
}

if ($OCISync) {
  Invoke-IfCli -Cli "oci" -Label "OCI auth/status" -Action {
    oci iam region-subscription list --all
    Write-Host "[INFO] Add project-specific OCI sync commands when required."
  }
}

if ($GitKrakenSync) {
  Invoke-IfCli -Cli "gk" -Label "GitKraken status" -Action {
    gk --version
    Write-Host "[INFO] Add project-specific GitKraken CLI sync commands when required."
  }
}

Write-Host "`n[DONE] PUSH_ALL_SYSTEMS completed."
