[CmdletBinding()]
param(
    [switch]$SkipStart,
    [switch]$NoFrontend
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$StartScript = Join-Path $RepoRoot "START_GODMODE.ps1"
$FrontendRoot = Join-Path $RepoRoot "CoronaProjektschonwieder"

function Test-Url {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
    }
    catch {
        return $false
    }
}

if (-not (Test-Path -LiteralPath $StartScript)) {
    throw "Missing START_GODMODE.ps1 at $StartScript"
}

Write-Host "==============================================="
Write-Host " GODMODE CONTROL CENTER (ONE-CLICK)"
Write-Host "==============================================="

if (-not $SkipStart) {
    Write-Host "Starting stack via START_GODMODE.ps1 ..."
    & $StartScript
}
else {
    Write-Host "SkipStart enabled: stack startup skipped."
}

if (-not $NoFrontend) {
    if (-not (Test-Path -LiteralPath $FrontendRoot)) {
        Write-Host "WARN Frontend directory missing: $FrontendRoot"
    }
    elseif (-not (Test-Url -Url "http://127.0.0.1:4173")) {
        Write-Host "Starting frontend dev server (npm run dev) ..."
        $command = "Set-Location -LiteralPath `"$FrontendRoot`"; npm run dev"
        Start-Process -FilePath "powershell" -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $command) | Out-Null
    }
    else {
        Write-Host "Frontend already reachable on http://127.0.0.1:4173"
    }
}

$Urls = @(
    @{ Name = "Platform Homepage"; Url = "http://127.0.0.1:4173" },
    @{ Name = "OpenHands"; Url = "http://127.0.0.1:3000" },
    @{ Name = "Adapter Health"; Url = "http://127.0.0.1:3001/health" },
    @{ Name = "n8n"; Url = "http://127.0.0.1:5678" },
    @{ Name = "LangGraph"; Url = "http://127.0.0.1:8080/health" },
    @{ Name = "Dispatch Hub"; Url = "http://127.0.0.1:3901/health" }
)

Write-Host ""
Write-Host "Control Center URLs:"
foreach ($entry in $Urls) {
    Write-Host ("  - {0}: {1}" -f $entry.Name, $entry.Url)
}

Write-Host ""
Write-Host "Tip: start frontend with:"
Write-Host "  cd CoronaProjektschonwieder; npm run dev"
Write-Host ""
Write-Host "Done. One-click control center finished."
