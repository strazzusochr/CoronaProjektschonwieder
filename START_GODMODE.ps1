Write-Host "🚀 STARTING GODMODE ULTIMATE STACK (WINDOWS LOCAL)..."

$RepoRoot = $PSScriptRoot
$EnvFile = Join-Path $RepoRoot ".godmode_env"

function Resolve-GodmodeValue {
    param(
        [string]$Value,
        [string]$Fallback
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $Fallback
    }

    return $Value
}

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^export\s+([^=]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2].Trim() -replace '^"|"$', ''
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

if (-not $env:ORACLE_IP) {
    $env:ORACLE_IP = "127.0.0.1"
}

if (-not $env:N8N_ENCRYPTION_KEY) {
    $env:N8N_ENCRYPTION_KEY = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
}

# 1. OpenHands + adapter
Set-Location -Path (Join-Path $RepoRoot "openhands")
docker compose up -d
Write-Host "✅ OpenHands runtime running on :$(Resolve-GodmodeValue $env:OPENHANDS_PORT '3000')"

# 2. n8n
Set-Location -Path (Join-Path $RepoRoot "n8n")
docker compose up -d
Write-Host "✅ n8n running on :$(Resolve-GodmodeValue $env:N8N_PORT '5678')"

# 3. LangGraph orchestrator
Set-Location -Path (Join-Path $RepoRoot "langgraph")
docker compose up -d
Write-Host "✅ LangGraph running on :$(Resolve-GodmodeValue $env:LANGGRAPH_PORT '8080')"

# 4. Status
Start-Sleep -Seconds 3
Write-Host ""
Write-Host "═══════════════════════════════════════"
Write-Host "  GODMODE STACK STATUS (LOCAL WINDOWS)"
Write-Host "═══════════════════════════════════════"
Write-Host "  OpenHands:        $(Resolve-GodmodeValue $env:OPENHANDS_PUBLIC_URL 'http://localhost:3000')"
Write-Host "  OpenHands Adapter:$(Resolve-GodmodeValue $env:OPENHANDS_ADAPTER_URL 'http://localhost:3001')"
Write-Host "  n8n:              $(Resolve-GodmodeValue $env:N8N_EDITOR_BASE_URL 'http://localhost:5678')"
Write-Host "  LangGraph:        $(Resolve-GodmodeValue $env:LANGGRAPH_API_URL 'http://localhost:8080')"
Write-Host "  Aider (CLI):      .\\aider_godmode.ps1"
Write-Host "  bolt.diy (HF):    $($env:BOLTDIY_SPACE_URL)"
Write-Host "═══════════════════════════════════════"
Write-Host "  CANONICAL STACK ONLINE. GODMODE ACTIVE."
Write-Host "═══════════════════════════════════════"
