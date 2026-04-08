Write-Host "STARTING GODMODE ULTIMATE STACK (WINDOWS LOCAL)..."

$RepoRoot = $PSScriptRoot
$EnvFile = Join-Path $RepoRoot ".godmode_env"
$RuntimeDir = Join-Path $RepoRoot ".godmode_runtime"
$N8nKeyFile = Join-Path $RuntimeDir "n8n_encryption_key.txt"

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

function Get-StableN8nEncryptionKey {
    if (-not (Test-Path $RuntimeDir)) {
        New-Item -ItemType Directory -Path $RuntimeDir | Out-Null
    }

    if (-not (Test-Path $N8nKeyFile)) {
        try {
            $configJson = docker run --rm -v n8n_n8n_data:/data alpine sh -lc "cat /data/config 2>/dev/null"
            if ($configJson) {
                $config = $configJson | ConvertFrom-Json
                if ($config.encryptionKey) {
                    Set-Content -Path $N8nKeyFile -Value $config.encryptionKey -Encoding ascii
                    return $config.encryptionKey
                }
            }
        }
        catch {
        }
    }

    if (-not (Test-Path $N8nKeyFile)) {
        $stableKey = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
        Set-Content -Path $N8nKeyFile -Value $stableKey -Encoding ascii
        return $stableKey
    }

    return (Get-Content $N8nKeyFile -Raw).Trim()
}

function Test-HttpEndpoint {
    param(
        [string]$Url,
        [string]$Label,
        [int]$MaxAttempts = 20,
        [int]$DelaySeconds = 2,
        [hashtable]$Headers = @{}
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Headers $Headers -TimeoutSec 10
            Write-Host "OK  $Label -> $Url ($($response.StatusCode))"
            return $true
        }
        catch {
            Start-Sleep -Seconds $DelaySeconds
        }
    }

    Write-Host "WARN $Label -> $Url (unreachable)"
    return $false
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
    $env:N8N_ENCRYPTION_KEY = Get-StableN8nEncryptionKey
}

# 1. OpenHands + adapter
Set-Location -Path (Join-Path $RepoRoot "openhands")
docker compose up -d
Write-Host "OK  OpenHands compose running on :$(Resolve-GodmodeValue $env:OPENHANDS_PORT '3000')"

# 2. n8n
Set-Location -Path (Join-Path $RepoRoot "n8n")
docker compose up -d
Write-Host "OK  n8n compose running on :$(Resolve-GodmodeValue $env:N8N_PORT '5678')"

# 3. LangGraph orchestrator
Set-Location -Path (Join-Path $RepoRoot "langgraph")
docker compose up -d --build
Write-Host "OK  LangGraph compose running on :$(Resolve-GodmodeValue $env:LANGGRAPH_PORT '8080')"

# 4. Health verification
$localOpenHandsUrl = "http://127.0.0.1:$(Resolve-GodmodeValue $env:OPENHANDS_PORT '3000')"
$localAdapterUrl = "http://127.0.0.1:$(Resolve-GodmodeValue $env:OPENHANDS_ADAPTER_PORT '3001')/health"
$localLangGraphUrl = "http://127.0.0.1:$(Resolve-GodmodeValue $env:LANGGRAPH_PORT '8080')/health"
$localN8nUrl = "http://127.0.0.1:$(Resolve-GodmodeValue $env:N8N_PORT '5678')/healthz"

$null = Test-HttpEndpoint -Url $localOpenHandsUrl -Label "OpenHands"
$null = Test-HttpEndpoint -Url $localAdapterUrl -Label "OpenHands Adapter"
$null = Test-HttpEndpoint -Url $localLangGraphUrl -Label "LangGraph"

$n8nHeaders = @{}
if ($env:N8N_BASIC_AUTH_USER -and $env:N8N_BASIC_AUTH_PASSWORD) {
    $pair = [Convert]::ToBase64String(
        [Text.Encoding]::ASCII.GetBytes("$($env:N8N_BASIC_AUTH_USER):$($env:N8N_BASIC_AUTH_PASSWORD)")
    )
    $n8nHeaders["Authorization"] = "Basic $pair"
}
$null = Test-HttpEndpoint -Url $localN8nUrl -Label "n8n" -Headers $n8nHeaders

# 5. Status
Write-Host ""
Write-Host "======================================="
Write-Host "  GODMODE STACK STATUS (LOCAL WINDOWS)"
Write-Host "======================================="
Write-Host "  OpenHands local:  $localOpenHandsUrl"
Write-Host "  Adapter local:    http://127.0.0.1:$(Resolve-GodmodeValue $env:OPENHANDS_ADAPTER_PORT '3001')"
Write-Host "  n8n local:        http://127.0.0.1:$(Resolve-GodmodeValue $env:N8N_PORT '5678')"
Write-Host "  LangGraph local:  http://127.0.0.1:$(Resolve-GodmodeValue $env:LANGGRAPH_PORT '8080')"
Write-Host "  n8n hosted:       $(Resolve-GodmodeValue $env:N8N_EDITOR_BASE_URL 'unset')"
Write-Host "  Aider (CLI):      .\\aider_godmode.ps1"
Write-Host "  bolt.diy (HF):    $(Resolve-GodmodeValue $env:BOLTDIY_SPACE_URL 'unset')"
Write-Host "======================================="
Write-Host "  CANONICAL STACK ONLINE. GODMODE ACTIVE."
Write-Host "======================================="
