Write-Host "STARTING GODMODE ULTIMATE STACK (WINDOWS CORE)..."

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
            $dockerContextArgs = @()
            if ($env:CORE_DOCKER_CONTEXT -and $env:CORE_DOCKER_CONTEXT -ne "default") {
                $dockerContextArgs = @("--context", $env:CORE_DOCKER_CONTEXT)
            }
            $configJson = docker @dockerContextArgs run --rm -v n8n_n8n_data:/data alpine sh -lc "cat /data/config 2>/dev/null"
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

if (-not $env:CORE_RUNTIME_PROVIDER) {
    $env:CORE_RUNTIME_PROVIDER = "local"
}

if (-not $env:CORE_RUNTIME_MODE) {
    $env:CORE_RUNTIME_MODE = "local"
}

if (-not $env:CORE_RUNTIME_HOST) {
    $env:CORE_RUNTIME_HOST = "127.0.0.1"
}

if (-not $env:CORE_RUNTIME_PUBLIC_URL) {
    $env:CORE_RUNTIME_PUBLIC_URL = "http://$($env:CORE_RUNTIME_HOST)"
}

if (-not $env:CORE_DOCKER_CONTEXT) {
    $env:CORE_DOCKER_CONTEXT = "default"
}

if (-not $env:CORE_DEPLOY_PROFILE) {
    $env:CORE_DEPLOY_PROFILE = "local"
}

if (-not $env:LITELLM_PORT) {
    $env:LITELLM_PORT = "4000"
}

if (-not $env:BOLTDIY_MODE) {
    $env:BOLTDIY_MODE = "hybrid"
}

if (-not $env:BOLTDIY_FACADE_PORT) {
    $env:BOLTDIY_FACADE_PORT = "3901"
}

if (-not $env:BOLTDIY_FACADE_URL) {
    $host = Resolve-GodmodeValue $env:CORE_RUNTIME_HOST "127.0.0.1"
    $port = Resolve-GodmodeValue $env:BOLTDIY_FACADE_PORT "3901"
    $env:BOLTDIY_FACADE_URL = "http://${host}:${port}"
}

if (-not $env:BOLTDIY_FORWARD_TIMEOUT) {
    $env:BOLTDIY_FORWARD_TIMEOUT = "20"
}

if (-not $env:DEVTOOLS_BRIDGE_ENABLED) {
    $env:DEVTOOLS_BRIDGE_ENABLED = "true"
}

if (-not $env:DEVTOOLS_BRIDGE_HOST) {
    $env:DEVTOOLS_BRIDGE_HOST = "0.0.0.0"
}

if (-not $env:DEVTOOLS_BRIDGE_PORT) {
    $env:DEVTOOLS_BRIDGE_PORT = "3911"
}

if (-not $env:DEVTOOLS_BRIDGE_TIMEOUT) {
    $env:DEVTOOLS_BRIDGE_TIMEOUT = "900"
}

if (-not $env:DEVTOOLS_BRIDGE_COMMAND_TIMEOUT) {
    $env:DEVTOOLS_BRIDGE_COMMAND_TIMEOUT = "900"
}

if (-not $env:ORACLE_ENABLED) {
    $env:ORACLE_ENABLED = "false"
}

if (-not $env:ORACLE_PLACEHOLDER) {
    $env:ORACLE_PLACEHOLDER = "true"
}

if (-not $env:ORACLE_RESERVED_FOR_FUTURE) {
    $env:ORACLE_RESERVED_FOR_FUTURE = "true"
}

if (-not $env:HF_VERIFY_STRICT) {
    $env:HF_VERIFY_STRICT = "true"
}

if (-not $env:ORACLE_VERIFY_ENABLED) {
    $env:ORACLE_VERIFY_ENABLED = "true"
}

$dockerContextArgs = @()
if ($env:CORE_DOCKER_CONTEXT -and $env:CORE_DOCKER_CONTEXT -ne "default") {
    $dockerContextArgs = @("--context", $env:CORE_DOCKER_CONTEXT)
}

if (-not $env:N8N_ENCRYPTION_KEY) {
    $env:N8N_ENCRYPTION_KEY = Get-StableN8nEncryptionKey
}

# 0. LiteLLM router
Set-Location -Path (Join-Path $RepoRoot "litellm")
docker @dockerContextArgs compose up -d
Write-Host "OK  LiteLLM compose running on :$(Resolve-GodmodeValue $env:LITELLM_PORT '4000')"

# 1. bolt-facade
Set-Location -Path (Join-Path $RepoRoot "bolt_facade")
docker @dockerContextArgs compose up -d
Write-Host "OK  bolt-facade compose running on :$(Resolve-GodmodeValue $env:BOLTDIY_FACADE_PORT '3901')"

# 2. OpenHands + adapter
Set-Location -Path (Join-Path $RepoRoot "openhands")
docker @dockerContextArgs compose up -d
Write-Host "OK  OpenHands compose running on :$(Resolve-GodmodeValue $env:OPENHANDS_PORT '3000')"

# 3. n8n
Set-Location -Path (Join-Path $RepoRoot "n8n")
docker @dockerContextArgs compose up -d
Write-Host "OK  n8n compose running on :$(Resolve-GodmodeValue $env:N8N_PORT '5678')"

# 4. LangGraph orchestrator
Set-Location -Path (Join-Path $RepoRoot "langgraph")
docker @dockerContextArgs compose up -d --build
Write-Host "OK  LangGraph compose running on :$(Resolve-GodmodeValue $env:LANGGRAPH_PORT '8080')"

# 4b. Core tools bridge (host process)
$runtimeHost = Resolve-GodmodeValue $env:CORE_RUNTIME_HOST "127.0.0.1"
$bridgePort = Resolve-GodmodeValue $env:DEVTOOLS_BRIDGE_PORT "3911"
$bridgeHealthUrl = "http://$($runtimeHost):$bridgePort/health"

if ((Resolve-GodmodeValue $env:DEVTOOLS_BRIDGE_ENABLED "true").ToLowerInvariant() -eq "true") {
    $bridgeReachable = $false
    try {
        $bridgePing = Invoke-WebRequest -UseBasicParsing -Uri $bridgeHealthUrl -TimeoutSec 2
        if ($bridgePing.StatusCode -eq 200) {
            $bridgeReachable = $true
        }
    }
    catch {
    }

    if (-not $bridgeReachable) {
        $bridgeScript = Join-Path $RepoRoot "core_tools_bridge.py"
        $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
        if ((Test-Path $bridgeScript) -and $pythonCommand) {
            $bridgeEnv = @{
                "DEVTOOLS_BRIDGE_HOST" = Resolve-GodmodeValue $env:DEVTOOLS_BRIDGE_HOST "0.0.0.0"
                "DEVTOOLS_BRIDGE_PORT" = $bridgePort
                "DEVTOOLS_BRIDGE_COMMAND_TIMEOUT" = Resolve-GodmodeValue $env:DEVTOOLS_BRIDGE_COMMAND_TIMEOUT "900"
                "DEVTOOLS_FRONTEND_DIR" = Resolve-GodmodeValue $env:DEVTOOLS_FRONTEND_DIR (Join-Path $RepoRoot "CoronaProjektschonwieder")
            }

            foreach ($item in $bridgeEnv.GetEnumerator()) {
                [System.Environment]::SetEnvironmentVariable($item.Key, $item.Value, "Process")
            }

            Start-Process -FilePath $pythonCommand.Source -ArgumentList @($bridgeScript) -WindowStyle Hidden | Out-Null
            Start-Sleep -Seconds 2
            Write-Host "OK  Core tools bridge started on :$bridgePort"
        }
        else {
            Write-Host "WARN Core tools bridge not started (python or script missing)"
        }
    }
    else {
        Write-Host "OK  Core tools bridge already reachable on :$bridgePort"
    }
}

# 4. Health verification
$localLiteLLMUrl = "http://${runtimeHost}:$(Resolve-GodmodeValue $env:LITELLM_PORT '4000')/"
$localOpenHandsUrl = "http://${runtimeHost}:$(Resolve-GodmodeValue $env:OPENHANDS_PORT '3000')"
$localAdapterUrl = "http://${runtimeHost}:$(Resolve-GodmodeValue $env:OPENHANDS_ADAPTER_PORT '3001')/health"
$localLangGraphUrl = "http://${runtimeHost}:$(Resolve-GodmodeValue $env:LANGGRAPH_PORT '8080')/health"
$localN8nUrl = "http://${runtimeHost}:$(Resolve-GodmodeValue $env:N8N_PORT '5678')/healthz"
$localBoltFacadeUrl = "http://${runtimeHost}:$(Resolve-GodmodeValue $env:BOLTDIY_FACADE_PORT '3901')/health"
$localBridgeUrl = "http://${runtimeHost}:$(Resolve-GodmodeValue $env:DEVTOOLS_BRIDGE_PORT '3911')/health"

$null = Test-HttpEndpoint -Url $localLiteLLMUrl -Label "LiteLLM"
$null = Test-HttpEndpoint -Url $localBoltFacadeUrl -Label "bolt-facade"
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

if ((Resolve-GodmodeValue $env:DEVTOOLS_BRIDGE_ENABLED "true").ToLowerInvariant() -eq "true") {
    $null = Test-HttpEndpoint -Url $localBridgeUrl -Label "Core Tools Bridge"
}

# 5. Status
Write-Host ""
Write-Host "======================================="
Write-Host "  GODMODE STACK STATUS (WINDOWS CORE)"
Write-Host "======================================="
Write-Host "  Core provider:     $(Resolve-GodmodeValue $env:CORE_RUNTIME_PROVIDER 'local')"
Write-Host "  Core mode:         $(Resolve-GodmodeValue $env:CORE_RUNTIME_MODE 'local')"
Write-Host "  Core host:         $(Resolve-GodmodeValue $env:CORE_RUNTIME_HOST '127.0.0.1')"
Write-Host "  Deploy profile:    $(Resolve-GodmodeValue $env:CORE_DEPLOY_PROFILE 'local')"
Write-Host "  Docker context:    $(Resolve-GodmodeValue $env:CORE_DOCKER_CONTEXT 'default')"
Write-Host "  LiteLLM local:    http://${runtimeHost}:$(Resolve-GodmodeValue $env:LITELLM_PORT '4000')"
Write-Host "  bolt-facade:      http://${runtimeHost}:$(Resolve-GodmodeValue $env:BOLTDIY_FACADE_PORT '3901')"
Write-Host "  OpenHands local:  $localOpenHandsUrl"
Write-Host "  Adapter local:    http://${runtimeHost}:$(Resolve-GodmodeValue $env:OPENHANDS_ADAPTER_PORT '3001')"
Write-Host "  n8n local:        http://${runtimeHost}:$(Resolve-GodmodeValue $env:N8N_PORT '5678')"
Write-Host "  LangGraph local:  http://${runtimeHost}:$(Resolve-GodmodeValue $env:LANGGRAPH_PORT '8080')"
Write-Host "  DevTools bridge:  http://${runtimeHost}:$(Resolve-GodmodeValue $env:DEVTOOLS_BRIDGE_PORT '3911')"
Write-Host "  n8n hosted:       $(Resolve-GodmodeValue $env:N8N_EDITOR_BASE_URL 'unset')"
Write-Host "  Aider (CLI):      .\\aider_godmode.ps1"
Write-Host "  bolt.diy (HF):    $(Resolve-GodmodeValue $env:BOLTDIY_SPACE_URL 'unset')"
Write-Host "  HF verify strict: $(Resolve-GodmodeValue $env:HF_VERIFY_STRICT 'true')"
Write-Host "  Oracle verify:    $(Resolve-GodmodeValue $env:ORACLE_VERIFY_ENABLED 'true')"
Write-Host "  Oracle profile:   enabled=$(Resolve-GodmodeValue $env:ORACLE_ENABLED 'false'); placeholder=$(Resolve-GodmodeValue $env:ORACLE_PLACEHOLDER 'true')"
Write-Host "======================================="
Write-Host "  CANONICAL STACK ONLINE. GODMODE ACTIVE."
Write-Host "======================================="
