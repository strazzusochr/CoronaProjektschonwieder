Write-Host "STARTING GODMODE ULTIMATE STACK (WINDOWS CORE)..."
if ($PSVersionTable.PSVersion.Major -ge 7) {
    $global:PSNativeCommandUseErrorActionPreference = $false
}

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

function Get-HfCachedToken {
    $tokenFile = Join-Path $HOME ".cache\huggingface\token"
    if (-not (Test-Path $tokenFile)) {
        return ""
    }

    $token = (Get-Content $tokenFile -Raw).Trim()
    return $token
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

function Assert-RequiredEnv {
    param(
        [string]$Name,
        [string]$Reason
    )

    $value = [System.Environment]::GetEnvironmentVariable($Name, "Process")
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Preflight failed: missing required variable '$Name'. $Reason"
    }
    if ($value -match '^\s*(replace-with|changeme|your-|<|unset)') {
        throw "Preflight failed: variable '$Name' still has placeholder-like content. $Reason"
    }
}

function Ensure-CoreNetwork {
    param(
        [string[]]$DockerArgs
    )

    $networkName = Resolve-GodmodeValue $env:GODMODE_CORE_NETWORK "godmode_core"
    docker @DockerArgs network inspect $networkName *> $null
    if ($LASTEXITCODE -ne 0) {
        docker @DockerArgs network create $networkName | Out-Null
        Write-Host "OK  Core network created: $networkName"
    }
    else {
        Write-Host "OK  Core network present: $networkName"
    }
}

function Sync-N8nMissionWorkflow {
    param(
        [string[]]$DockerArgs,
        [string]$RepoRootPath,
        [string]$HealthHost,
        [string]$Port
    )

    $workflowPath = Join-Path $RepoRootPath "n8n_mission_workflow.json"
    if (-not (Test-Path $workflowPath)) {
        throw "n8n workflow sync failed: missing $workflowPath"
    }

    $containerName = "n8n-godmode"
    $runningNames = docker @DockerArgs ps --format "{{.Names}}"
    if ($LASTEXITCODE -ne 0 -or -not ($runningNames -contains $containerName)) {
        throw "n8n workflow sync failed: container $containerName not running"
    }

    docker @DockerArgs cp $workflowPath "${containerName}:/tmp/n8n_mission_workflow.json" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "n8n workflow sync failed during docker cp"
    }

    docker @DockerArgs exec $containerName n8n import:workflow --input=/tmp/n8n_mission_workflow.json | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "n8n workflow sync failed during import"
    }

    docker @DockerArgs exec $containerName n8n publish:workflow --id=godmodeMissionTrigger01 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "n8n workflow activation failed"
    }

    docker @DockerArgs restart $containerName | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "n8n container restart failed after publish"
    }

    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $payload = @{
        agent = "GODMODE-Init"
        task = "n8n webhook activation smoke"
        source = "start_godmode"
        repo = Resolve-GodmodeValue $env:GITHUB_REPO_URL "https://github.com/strazzusochr/CoronaProjektschonwieder"
        ref = "main"
        status = "triggered"
        timestamp = $timestamp
    } | ConvertTo-Json -Compress

    $headers = @{
        "Content-Type" = "application/json"
    }
    if ($env:N8N_BASIC_AUTH_USER -and $env:N8N_BASIC_AUTH_PASSWORD) {
        $pair = [Convert]::ToBase64String(
            [Text.Encoding]::ASCII.GetBytes("$($env:N8N_BASIC_AUTH_USER):$($env:N8N_BASIC_AUTH_PASSWORD)")
        )
        $headers["Authorization"] = "Basic $pair"
    }

    $healthUrl = "http://${HealthHost}:$Port/healthz"
    for ($attempt = 1; $attempt -le 30; $attempt++) {
        try {
            Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -Headers $headers -TimeoutSec 10 | Out-Null
            break
        }
        catch {
            if ($attempt -eq 30) {
                throw "n8n health did not recover after publish/restart"
            }
            Start-Sleep -Seconds 2
        }
    }

    $webhookCandidates = @(
        "http://${HealthHost}:$Port/webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission",
        "http://${HealthHost}:$Port/webhook/godmode-mission"
    )
    $smokePassed = $false
    foreach ($webhookUrl in $webhookCandidates) {
        for ($attempt = 1; $attempt -le 10; $attempt++) {
            try {
                Invoke-WebRequest -UseBasicParsing -Method POST -Uri $webhookUrl -Headers $headers -Body $payload -TimeoutSec 20 | Out-Null
                $smokePassed = $true
                break
            }
            catch {
                if ($attempt -lt 10) {
                    Start-Sleep -Seconds 2
                }
            }
        }
        if ($smokePassed) {
            break
        }
    }
    if (-not $smokePassed) {
        throw "n8n mission webhook smoke failed after activation"
    }
    Write-Host "OK  n8n mission workflow synced + active + webhook smoke passed"
}

function Sync-N8nMemoryWorkflow {
    param(
        [string[]]$DockerArgs,
        [string]$RepoRootPath
    )

    $probeWorkflowPath = Join-Path $RepoRootPath "n8n_memory_probe_workflow.json"
    $systemWorkflowPath = Join-Path $RepoRootPath "n8n_memory_workflow.json"
    if (-not (Test-Path $probeWorkflowPath)) {
        throw "n8n memory workflow sync failed: missing $probeWorkflowPath"
    }
    if (-not (Test-Path $systemWorkflowPath)) {
        throw "n8n memory workflow sync failed: missing $systemWorkflowPath"
    }

    $containerName = "n8n-godmode"
    $runningNames = docker @DockerArgs ps --format "{{.Names}}"
    if ($LASTEXITCODE -ne 0 -or -not ($runningNames -contains $containerName)) {
        throw "n8n memory workflow sync failed: container $containerName not running"
    }

    docker @DockerArgs cp $probeWorkflowPath "${containerName}:/tmp/n8n_memory_probe_workflow.json" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "n8n memory workflow sync failed during probe docker cp"
    }

    docker @DockerArgs cp $systemWorkflowPath "${containerName}:/tmp/n8n_memory_workflow.json" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "n8n memory workflow sync failed during system docker cp"
    }

    docker @DockerArgs exec $containerName n8n import:workflow --input=/tmp/n8n_memory_probe_workflow.json | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "n8n memory probe workflow import failed"
    }

    docker @DockerArgs exec $containerName n8n import:workflow --input=/tmp/n8n_memory_workflow.json | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "n8n memory system workflow import failed"
    }

    docker @DockerArgs exec $containerName n8n publish:workflow --id=godmodeMemoryProbe01 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "n8n memory probe workflow publish failed"
    }

    docker @DockerArgs exec $containerName n8n publish:workflow --id=godmodeMemorySystem01 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "n8n memory system workflow publish failed"
    }

    $composeFile = Join-Path $RepoRootPath "n8n/docker-compose.yml"
    $executeOutput = & {
        $previousErrorAction = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            docker @DockerArgs compose -f $composeFile run --rm n8n execute --id=godmodeMemoryProbe01 --rawOutput 2>&1
        }
        finally {
            $ErrorActionPreference = $previousErrorAction
        }
    }
    if ($LASTEXITCODE -ne 0) {
        throw "n8n memory workflow execute failed"
    }

    $outputText = ($executeOutput | Out-String)
    if ($outputText -notmatch '"status"\s*:\s*"saved"') {
        throw "n8n memory workflow execute returned no saved marker"
    }

    Write-Host "OK  n8n memory workflow synced + probe saved to memory vault"
}

function Patch-OpenHandsFrontendBootstrap {
    param(
        [string[]]$DockerArgs
    )

    $containerName = "openhands-godmode"
    $runningNames = docker @DockerArgs ps --format "{{.Names}}"
    if ($LASTEXITCODE -ne 0 -or -not ($runningNames -contains $containerName)) {
        throw "OpenHands frontend patch failed: container $containerName not running"
    }

    $pythonPatch = @'
import pathlib
import sys

assets_dir = pathlib.Path("/app/frontend/build/assets")
candidates = sorted(assets_dir.glob("user-prefs-context-*.js"))
if not candidates:
    print("OpenHands frontend patch failed: no user-prefs-context bundle found", file=sys.stderr)
    sys.exit(2)

target = candidates[0]
text = target.read_text(encoding="utf-8", errors="ignore")

replacements = [
    ('LLM_MODEL:"anthropic/claude-3-5-sonnet-20241022"', 'LLM_MODEL:"smart-router"'),
    ('LLM_BASE_URL:""', 'LLM_BASE_URL:"http://litellm-godmode:4000"'),
    ("xu=()=>za()===Pa", "xu=()=>!0"),
]

updated = text
for old, new in replacements:
    updated = updated.replace(old, new)

if "xu=()=>!0" not in updated:
    print("OpenHands frontend patch failed: settingsAreUpToDate override not applied", file=sys.stderr)
    sys.exit(3)

target.write_text(updated, encoding="utf-8")
print(f"patched:{target}")
'@

    $pythonPatch | docker @DockerArgs exec -i $containerName python -
    if ($LASTEXITCODE -ne 0) {
        throw "OpenHands frontend patch failed during docker exec"
    }
    Write-Host "OK  OpenHands frontend bootstrap patch applied (settings gate + LiteLLM defaults)"
}

function Sanitize-OpenHandsState {
    param(
        [string]$RepoRootPath,
        [string]$RuntimeDirPath
    )

    $sanitizerScript = Join-Path $RepoRootPath "ops/sanitize_openhands_state.py"
    if (-not (Test-Path $sanitizerScript)) {
        Write-Host "WARN OpenHands state sanitizer script missing: $sanitizerScript"
        return $false
    }

    $stateRoot = Resolve-GodmodeValue $env:OPENHANDS_STATE_HOST_PATH (Join-Path $HOME ".openhands-state")
    $evidenceDir = Join-Path $RuntimeDirPath "evidence"
    $fallbackApiKey = Resolve-GodmodeValue $env:OPENHANDS_LLM_API_KEY (Resolve-GodmodeValue $env:LITELLM_API_KEY "")

    $pythonExecutable = $null
    $pythonArgsPrefix = @()

    $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
    if ($pyLauncher) {
        $pythonExecutable = $pyLauncher.Source
        $pythonArgsPrefix = @("-3")
    }
    else {
        $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
        if ($pythonCmd) {
            $pythonExecutable = $pythonCmd.Source
        }
    }

    if (-not $pythonExecutable) {
        Write-Host "WARN OpenHands state sanitizer skipped (python missing on host)"
        return $false
    }

    $args = @()
    if ($pythonArgsPrefix.Count -gt 0) {
        $args += $pythonArgsPrefix
    }
    $args += @(
        $sanitizerScript,
        "--state-root",
        $stateRoot,
        "--evidence-dir",
        $evidenceDir,
        "--fallback-llm-api-key",
        $fallbackApiKey
    )

    & $pythonExecutable @args
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARN OpenHands state sanitizer failed"
        return $false
    }

    Write-Host "OK  OpenHands state sanitizer completed ($stateRoot)"
    return $true
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

if (-not $env:GODMODE_CORE_NETWORK) {
    $env:GODMODE_CORE_NETWORK = "godmode_core"
}

if (-not $env:LOCAL_HEALTHCHECK_HOST) {
    $env:LOCAL_HEALTHCHECK_HOST = "127.0.0.1"
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
    $runtimeHostForBoltFacade = Resolve-GodmodeValue $env:CORE_RUNTIME_HOST "127.0.0.1"
    $port = Resolve-GodmodeValue $env:BOLTDIY_FACADE_PORT "3901"
    $env:BOLTDIY_FACADE_URL = "http://${runtimeHostForBoltFacade}:${port}"
}

if (-not $env:BOLTDIY_FACADE_INTERNAL_URL) {
    $env:BOLTDIY_FACADE_INTERNAL_URL = "http://bolt-facade-godmode:3901"
}

if (-not $env:BOLTDIY_FORWARD_TIMEOUT) {
    $env:BOLTDIY_FORWARD_TIMEOUT = "20"
}

if (-not $env:CONTROL_CENTER_STATUS_CACHE_TTL) {
    $env:CONTROL_CENTER_STATUS_CACHE_TTL = "8"
}

if (-not $env:DISPATCH_APPEND_PROJECT_LOGS) {
    $env:DISPATCH_APPEND_PROJECT_LOGS = "false"
}

if (-not $env:BOLTDIY_SPACE_ID) {
    $env:BOLTDIY_SPACE_ID = "Wrzzzrzr/bolt-diy-godmode"
}

if (-not $env:BOLTDIY_SPACE_URL -and $env:BOLTDIY_SPACE_ID -match ".+/.+") {
    $env:BOLTDIY_SPACE_URL = "https://huggingface.co/spaces/$($env:BOLTDIY_SPACE_ID)"
}

if (-not $env:HF_TOKEN) {
    $cachedToken = Get-HfCachedToken
    if ($cachedToken) {
        $env:HF_TOKEN = $cachedToken
        Write-Host "OK  HF token loaded from local Hugging Face cache"
    }
}

if (-not $env:BOLTDIY_SPACE_TOKEN -and $env:HF_TOKEN) {
    $env:BOLTDIY_SPACE_TOKEN = $env:HF_TOKEN
}

if (-not $env:OLLAMAHF_BASE_URL) {
    $env:OLLAMAHF_BASE_URL = "https://cgjgj-ollamahftrae.hf.space"
}

if (-not $env:OLLAMAHF_MASTER_KEY) {
    $env:OLLAMAHF_MASTER_KEY = ""
}

if (-not $env:OLLAMAHF_BEARER_TOKEN) {
    $env:OLLAMAHF_BEARER_TOKEN = ""
}

if (-not $env:AGENT_REGISTRY_PATH) {
    $env:AGENT_REGISTRY_PATH = Join-Path $RepoRoot "agent_registry.json"
}

if (-not $env:ZERO_COMPUTE_POLICY) {
    $env:ZERO_COMPUTE_POLICY = "true"
}

if (-not $env:GODMODE_ALLOW_LOCAL_HEAVY) {
    $env:GODMODE_ALLOW_LOCAL_HEAVY = "false"
}

if (-not $env:SMOLAGENTS_URL -and $env:HF_SMOLAGENTS_SPACE_URL) {
    $env:SMOLAGENTS_URL = $env:HF_SMOLAGENTS_SPACE_URL
}

if (-not $env:HF_AIDER_URL -and $env:HF_AIDER_SPACE_URL) {
    $env:HF_AIDER_URL = $env:HF_AIDER_SPACE_URL
}

if (-not $env:OPENHANDS_API_INTERNAL_URL) {
    $env:OPENHANDS_API_INTERNAL_URL = "http://openhands-godmode:3000"
}

if (-not $env:OPENHANDS_ADAPTER_INTERNAL_URL) {
    $env:OPENHANDS_ADAPTER_INTERNAL_URL = "http://openhands-godmode-adapter:3001"
}

if (-not $env:OPENHANDS_ADAPTER_URL) {
    $env:OPENHANDS_ADAPTER_URL = $env:OPENHANDS_ADAPTER_INTERNAL_URL
}

if (-not $env:OPENHANDS_TRIGGER_MODE) {
    $env:OPENHANDS_TRIGGER_MODE = "socketio"
}

if (-not $env:OPENHANDS_TRIGGER_WAIT_SECONDS) {
    $env:OPENHANDS_TRIGGER_WAIT_SECONDS = "45"
}

if (-not $env:OPENHANDS_SOCKET_PATH) {
    $env:OPENHANDS_SOCKET_PATH = "/socket.io"
}

if (-not $env:OPENHANDS_PUBLIC_URL) {
    $localOpenHandsPort = Resolve-GodmodeValue $env:OPENHANDS_PORT "3000"
    $env:OPENHANDS_PUBLIC_URL = "http://127.0.0.1:$localOpenHandsPort"
}

if (-not $env:OPENHANDS_LLM_MODEL) {
    $env:OPENHANDS_LLM_MODEL = "smart-router"
}

if (-not $env:OPENHANDS_LLM_BASE_URL) {
    $env:OPENHANDS_LLM_BASE_URL = "http://litellm-godmode:4000"
}

if (-not $env:OPENHANDS_LLM_API_KEY -and $env:LITELLM_API_KEY) {
    $env:OPENHANDS_LLM_API_KEY = $env:LITELLM_API_KEY
}

if (-not $env:OPENHANDS_FILE_STORE) {
    $env:OPENHANDS_FILE_STORE = "local"
}

if (-not $env:OPENHANDS_FILE_STORE_PATH) {
    $env:OPENHANDS_FILE_STORE_PATH = "/.openhands-state"
}

if (-not $env:OPENHANDS_WORKSPACE_HOST_PATH) {
    $env:OPENHANDS_WORKSPACE_HOST_PATH = $RepoRoot
}
if (-not (Test-Path -LiteralPath $env:OPENHANDS_WORKSPACE_HOST_PATH)) {
    throw "Preflight failed: OPENHANDS_WORKSPACE_HOST_PATH '$($env:OPENHANDS_WORKSPACE_HOST_PATH)' does not exist."
}

if (-not $env:LANGGRAPH_API_INTERNAL_URL) {
    $env:LANGGRAPH_API_INTERNAL_URL = "http://langgraph-godmode-local:8080"
}

if (-not $env:N8N_WEBHOOK_INTERNAL_URL) {
    $env:N8N_WEBHOOK_INTERNAL_URL = "http://n8n-godmode:5678/webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission"
}

if (-not $env:N8N_API_URL) {
    $env:N8N_API_URL = "http://n8n-godmode:5678/api/v1"
}

if (-not $env:N8N_MEMORY_PROBE_URL) {
    $env:N8N_MEMORY_PROBE_URL = "http://n8n-godmode:5678/webhook/godmodeMemoryProbe01/memory-probe-webhook/godmode-memory-probe"
}

if (-not $env:MEMORY_VAULT_PATH) {
    $env:MEMORY_VAULT_PATH = Join-Path $RuntimeDir "memory_vault_runtime.md"
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

if (-not $env:DEVTOOLS_BRIDGE_URL) {
    $env:DEVTOOLS_BRIDGE_URL = "http://host.docker.internal:3911"
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

$openhandsBaseUrl = Resolve-GodmodeValue $env:OPENHANDS_LLM_BASE_URL ""
Assert-RequiredEnv -Name "OPENHANDS_LLM_MODEL" -Reason "OpenHands must start with a deterministic default model for one-click usage."
Assert-RequiredEnv -Name "OPENHANDS_LLM_BASE_URL" -Reason "OpenHands needs a preconfigured LLM base URL to avoid manual provider setup."
Assert-RequiredEnv -Name "OPENHANDS_LLM_API_KEY" -Reason "OpenHands needs a non-empty API key value for automatic provider bootstrapping."
if ($openhandsBaseUrl -match "litellm-godmode|:4000") {
    Assert-RequiredEnv -Name "LITELLM_API_KEY" -Reason "LiteLLM is the configured OpenHands backend, so LITELLM_API_KEY must be present."
}

$null = Sanitize-OpenHandsState -RepoRootPath $RepoRoot -RuntimeDirPath $RuntimeDir

$dockerContextArgs = @()
if ($env:CORE_DOCKER_CONTEXT -and $env:CORE_DOCKER_CONTEXT -ne "default") {
    $dockerContextArgs = @("--context", $env:CORE_DOCKER_CONTEXT)
}

Ensure-CoreNetwork -DockerArgs $dockerContextArgs

if (-not $env:N8N_ENCRYPTION_KEY) {
    $env:N8N_ENCRYPTION_KEY = Get-StableN8nEncryptionKey
}

if (-not $env:N8N_WEBHOOK_URL) {
    $localWebhookHost = Resolve-GodmodeValue $env:LOCAL_HEALTHCHECK_HOST "127.0.0.1"
    $localWebhookPort = Resolve-GodmodeValue $env:N8N_PORT "5678"
    $env:N8N_WEBHOOK_URL = "http://${localWebhookHost}:$localWebhookPort/webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission"
}

# 0. LiteLLM router
Set-Location -Path (Join-Path $RepoRoot "litellm")
docker @dockerContextArgs compose up -d
Write-Host "OK  LiteLLM compose running on :$(Resolve-GodmodeValue $env:LITELLM_PORT '4000')"

# 1. bolt-facade
Set-Location -Path (Join-Path $RepoRoot "bolt_facade")
docker @dockerContextArgs compose up -d --build --force-recreate
Write-Host "OK  bolt-facade compose running on :$(Resolve-GodmodeValue $env:BOLTDIY_FACADE_PORT '3901')"

# 2. OpenHands + adapter
Set-Location -Path (Join-Path $RepoRoot "openhands")
docker @dockerContextArgs compose up -d
Write-Host "OK  OpenHands compose running on :$(Resolve-GodmodeValue $env:OPENHANDS_PORT '3000')"
Patch-OpenHandsFrontendBootstrap -DockerArgs $dockerContextArgs

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
        $pythonExecutable = $null
        $pythonArgumentsPrefix = @()

        $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
        if ($pyLauncher) {
            $pythonExecutable = $pyLauncher.Source
            $pythonArgumentsPrefix = @("-3")
        }
        else {
            $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
            if ($pythonCommand) {
                $pythonExecutable = $pythonCommand.Source
            }
        }

        if ((Test-Path $bridgeScript) -and $pythonExecutable) {
            $bridgeEnv = @{
                "DEVTOOLS_BRIDGE_HOST" = Resolve-GodmodeValue $env:DEVTOOLS_BRIDGE_HOST "0.0.0.0"
                "DEVTOOLS_BRIDGE_PORT" = $bridgePort
                "DEVTOOLS_BRIDGE_COMMAND_TIMEOUT" = Resolve-GodmodeValue $env:DEVTOOLS_BRIDGE_COMMAND_TIMEOUT "900"
                "DEVTOOLS_FRONTEND_DIR" = Resolve-GodmodeValue $env:DEVTOOLS_FRONTEND_DIR (Join-Path $RepoRoot "CoronaProjektschonwieder")
            }

            foreach ($item in $bridgeEnv.GetEnumerator()) {
                [System.Environment]::SetEnvironmentVariable($item.Key, $item.Value, "Process")
            }

            $bridgeArgs = @()
            if ($pythonArgumentsPrefix.Count -gt 0) {
                $bridgeArgs += $pythonArgumentsPrefix
            }
            $bridgeArgs += @($bridgeScript)
            Start-Process -FilePath $pythonExecutable -ArgumentList $bridgeArgs -WindowStyle Hidden | Out-Null
            Start-Sleep -Seconds 2
            $bridgeHealthCandidate = "http://$($runtimeHost):$bridgePort/health"
            $bridgeStarted = Test-HttpEndpoint -Url $bridgeHealthCandidate -Label "Core Tools Bridge (post-start)" -MaxAttempts 6 -DelaySeconds 2
            if ($bridgeStarted) {
                Write-Host "OK  Core tools bridge started on :$bridgePort"
            }
            else {
                Write-Host "WARN Core tools bridge process launched but health check did not pass"
            }
        }
        else {
            Write-Host "WARN Core tools bridge not started (python launcher or script missing)"
        }
    }
    else {
        Write-Host "OK  Core tools bridge already reachable on :$bridgePort"
    }
}

# 4. Health verification
$localHealthHost = Resolve-GodmodeValue $env:LOCAL_HEALTHCHECK_HOST "127.0.0.1"
$localLiteLLMUrl = "http://${localHealthHost}:$(Resolve-GodmodeValue $env:LITELLM_PORT '4000')/"
$localOpenHandsUrl = "http://${localHealthHost}:$(Resolve-GodmodeValue $env:OPENHANDS_PORT '3000')"
$localAdapterUrl = "http://${localHealthHost}:$(Resolve-GodmodeValue $env:OPENHANDS_ADAPTER_PORT '3001')/health"
$localLangGraphUrl = "http://${localHealthHost}:$(Resolve-GodmodeValue $env:LANGGRAPH_PORT '8080')/health"
$localN8nUrl = "http://${localHealthHost}:$(Resolve-GodmodeValue $env:N8N_PORT '5678')/healthz"
$localBoltFacadeUrl = "http://${localHealthHost}:$(Resolve-GodmodeValue $env:BOLTDIY_FACADE_PORT '3901')/health"
$localBridgeUrl = "http://${localHealthHost}:$(Resolve-GodmodeValue $env:DEVTOOLS_BRIDGE_PORT '3911')/health"

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
Sync-N8nMissionWorkflow -DockerArgs $dockerContextArgs -RepoRootPath $RepoRoot -HealthHost $localHealthHost -Port (Resolve-GodmodeValue $env:N8N_PORT "5678")
Sync-N8nMemoryWorkflow -DockerArgs $dockerContextArgs -RepoRootPath $RepoRoot

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
Write-Host "  OpenHands LLM:    model=$(Resolve-GodmodeValue $env:OPENHANDS_LLM_MODEL 'unset'); base=$(Resolve-GodmodeValue $env:OPENHANDS_LLM_BASE_URL 'unset')"
Write-Host "  n8n local:        http://${runtimeHost}:$(Resolve-GodmodeValue $env:N8N_PORT '5678')"
Write-Host "  LangGraph local:  http://${runtimeHost}:$(Resolve-GodmodeValue $env:LANGGRAPH_PORT '8080')"
Write-Host "  DevTools bridge:  http://${runtimeHost}:$(Resolve-GodmodeValue $env:DEVTOOLS_BRIDGE_PORT '3911')"
Write-Host "  n8n hosted:       $(Resolve-GodmodeValue $env:N8N_EDITOR_BASE_URL 'unset')"
Write-Host "  Aider (CLI):      .\\aider_godmode.ps1"
Write-Host "  smolagents (HF):  $(Resolve-GodmodeValue $env:HF_SMOLAGENTS_SPACE_URL 'unset')"
Write-Host "  OLLAMAHF base:    $(Resolve-GodmodeValue $env:OLLAMAHF_BASE_URL 'unset')"
Write-Host "  bolt.diy (HF):    $(Resolve-GodmodeValue $env:BOLTDIY_SPACE_URL 'unset')"
Write-Host "  Agent registry:   $(Resolve-GodmodeValue $env:AGENT_REGISTRY_PATH 'unset')"
Write-Host "  Zero compute:     $(Resolve-GodmodeValue $env:ZERO_COMPUTE_POLICY 'true') (allow_local_heavy=$(Resolve-GodmodeValue $env:GODMODE_ALLOW_LOCAL_HEAVY 'false'))"
Write-Host "  HF verify strict: $(Resolve-GodmodeValue $env:HF_VERIFY_STRICT 'true')"
Write-Host "  Oracle verify:    $(Resolve-GodmodeValue $env:ORACLE_VERIFY_ENABLED 'true')"
Write-Host "  Oracle profile:   enabled=$(Resolve-GodmodeValue $env:ORACLE_ENABLED 'false'); placeholder=$(Resolve-GodmodeValue $env:ORACLE_PLACEHOLDER 'true')"
Write-Host "======================================="
Write-Host "  CANONICAL STACK ONLINE. GODMODE ACTIVE."
Write-Host "======================================="
