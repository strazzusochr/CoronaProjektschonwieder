param(
    [switch]$StartStack,
    [switch]$Loop,
    [int]$LoopIntervalSeconds = 60
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

Write-Host "[AUTO] repo: $repo"

$required = @(
    "security_preflight.py",
    "verify_superbrain_merge.py",
    "autonomous_control_plane.py",
    "autonomy_supervisor_loop.py"
)

foreach ($f in $required) {
    if (-not (Test-Path $f)) {
        throw "[AUTO] missing required file: $f"
    }
}

function Invoke-Step {
    param(
        [string]$Name,
        [string]$Cmd
    )

    Write-Host "[AUTO] step: $Name"
    try {
        iex $Cmd
        Write-Host "[AUTO] ok: $Name"
    }
    catch {
        Write-Warning "[AUTO] failed: $Name"
        Write-Warning $_
    }
}

Invoke-Step -Name "security_preflight" -Cmd "python security_preflight.py"
Invoke-Step -Name "verify_superbrain_merge" -Cmd "python verify_superbrain_merge.py"
Invoke-Step -Name "init_control_plane" -Cmd "python autonomous_control_plane.py init"
Invoke-Step -Name "supervisor_once" -Cmd "python autonomy_supervisor_loop.py --once"

if ($StartStack) {
    Invoke-Step -Name "start_godmode_stack" -Cmd "& .\\START_GODMODE.ps1"
}

if ($Loop) {
    Write-Host "[AUTO] entering supervisor loop (interval=$LoopIntervalSeconds)"
    Invoke-Step -Name "supervisor_loop" -Cmd "python autonomy_supervisor_loop.py --interval $LoopIntervalSeconds"
}

Write-Host "[AUTO] completed"
