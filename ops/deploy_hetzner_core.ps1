[CmdletBinding()]
param(
    [string]$HostIp = "",

    [string]$SshUser = "",

    [string]$SshPassword = "",

    [string]$SshHostKey = "",

    [string]$FqdnRoot = "",

    [string]$TlsEmail = "",

    [string]$SshKeyPath = "",
    [string]$PlinkPath = "",
    [string]$PscpPath = "",
    [string]$Branch = "main",
    [string]$RemotePath = "/opt/godmode_setup",
    [string]$GitRepoUrl = "https://github.com/strazzusochr/CoronaProjektschonwieder.git",
    [switch]$SkipRemoteApply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$EvidenceDir = Join-Path $RepoRoot ".godmode_runtime/evidence"
New-Item -Path $EvidenceDir -ItemType Directory -Force | Out-Null

function Get-IsoStamp {
    return (Get-Date).ToUniversalTime().ToString("o")
}

function Get-FileStamp {
    return (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH-mm-ss-fffffffK").Replace(":", "-")
}

function Save-JsonEvidence {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BaseName,
        [Parameter(Mandatory = $true)]
        [hashtable]$Payload
    )
    $stamp = Get-FileStamp
    $file = Join-Path $EvidenceDir ("{0}_{1}.json" -f $BaseName, $stamp)
    $latest = Join-Path $EvidenceDir ("{0}_latest.json" -f $BaseName)
    ($Payload | ConvertTo-Json -Depth 20) | Set-Content -Path $file -Encoding utf8
    ($Payload | ConvertTo-Json -Depth 20) | Set-Content -Path $latest -Encoding utf8
    return $file
}

function Write-Utf8NoBomFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Content
    )
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Get-SshOptions {
    $opts = @(
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", "ConnectTimeout=12",
        "-o", "BatchMode=yes"
    )
    if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) {
        $opts += @("-i", $SshKeyPath)
    }
    return $opts
}

function Invoke-Ssh {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RemoteCommand
    )
    $output = @()
    $code = 0
    try {
        if ($UsePlink) {
            $args = @("-batch", "-ssh")
            if (-not [string]::IsNullOrWhiteSpace($SshHostKey)) {
                $args += @("-hostkey", $SshHostKey)
            }
            if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) {
                $args += @("-i", $SshKeyPath)
            }
            elseif (-not [string]::IsNullOrWhiteSpace($SshPassword)) {
                $args += @("-pw", $SshPassword)
            }
            $args += @("-l", $SshUser, $HostIp, $RemoteCommand)
            $output = & $PlinkExecutable @args 2>&1
            $code = $LASTEXITCODE
        }
        else {
            $target = "{0}@{1}" -f $SshUser, $HostIp
            $args = @()
            $args += Get-SshOptions
            $args += @($target, $RemoteCommand)
            $output = & ssh @args 2>&1
            $code = $LASTEXITCODE
        }
    }
    catch {
        $code = 1
        $output = @($_.Exception.Message)
    }
    return @{
        exit_code = $code
        output = ($output -join "`n")
    }
}

function Invoke-Scp {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LocalPath,
        [Parameter(Mandatory = $true)]
        [string]$RemotePathFull
    )
    $output = @()
    $code = 0
    try {
        if ($UsePlink) {
            $target = "{0}@{1}:{2}" -f $SshUser, $HostIp, $RemotePathFull
            $args = @("-batch")
            if (-not [string]::IsNullOrWhiteSpace($SshHostKey)) {
                $args += @("-hostkey", $SshHostKey)
            }
            if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) {
                $args += @("-i", $SshKeyPath)
            }
            elseif (-not [string]::IsNullOrWhiteSpace($SshPassword)) {
                $args += @("-pw", $SshPassword)
            }
            $args += @($LocalPath, $target)
            $output = & $PscpExecutable @args 2>&1
            $code = $LASTEXITCODE
        }
        else {
            $target = "{0}@{1}:{2}" -f $SshUser, $HostIp, $RemotePathFull
            $args = @()
            $args += Get-SshOptions
            $args += @($LocalPath, $target)
            $output = & scp @args 2>&1
            $code = $LASTEXITCODE
        }
    }
    catch {
        $code = 1
        $output = @($_.Exception.Message)
    }
    return @{
        exit_code = $code
        output = ($output -join "`n")
    }
}

function Parse-ExportFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )
    $map = @{}
    if (-not (Test-Path $Path)) {
        return $map
    }

    foreach ($line in Get-Content $Path) {
        if ($line -match '^\s*#') { continue }
        if ($line -match '^\s*$') { continue }
        if ($line -match '^\s*export\s+([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2].Trim()
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $map[$key] = $value
        }
    }
    return $map
}

function Resolve-ExecutablePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Preferred,
        [Parameter(Mandatory = $true)]
        [string]$CommandName
    )
    if (-not [string]::IsNullOrWhiteSpace($Preferred) -and (Test-Path $Preferred)) {
        return (Resolve-Path $Preferred).Path
    }
    $cmd = Get-Command $CommandName -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $cmd) {
        return $cmd.Source
    }
    return ""
}

function Set-EnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Map,
        [Parameter(Mandatory = $true)]
        [string]$Key,
        [Parameter(Mandatory = $true)]
        [string]$Value
    )
    $Map[$Key] = $Value
}

function Build-HetznerEnvMap {
    $exampleMap = Parse-ExportFile -Path (Join-Path $RepoRoot ".godmode_env.example")
    $localMap = Parse-ExportFile -Path (Join-Path $RepoRoot ".godmode_env")
    $map = @{}

    foreach ($k in $exampleMap.Keys) {
        $map[$k] = $exampleMap[$k]
    }
    foreach ($k in $localMap.Keys) {
        $map[$k] = $localMap[$k]
    }

    $openhandsHost = "openhands.$FqdnRoot"
    $adapterHost = "adapter.$FqdnRoot"
    $langgraphHost = "langgraph.$FqdnRoot"
    $n8nHost = "n8n.$FqdnRoot"
    $boltHost = "bolt.$FqdnRoot"

    Set-EnvValue -Map $map -Key "HETZNER_HOST_IP" -Value $HostIp
    Set-EnvValue -Map $map -Key "HETZNER_FQDN_ROOT" -Value $FqdnRoot
    Set-EnvValue -Map $map -Key "HETZNER_TLS_EMAIL" -Value $TlsEmail

    Set-EnvValue -Map $map -Key "CORE_RUNTIME_PROVIDER" -Value "selfhosted"
    Set-EnvValue -Map $map -Key "CORE_RUNTIME_MODE" -Value "selfhosted"
    Set-EnvValue -Map $map -Key "CORE_RUNTIME_HOST" -Value $HostIp
    Set-EnvValue -Map $map -Key "CORE_RUNTIME_PUBLIC_URL" -Value ("https://{0}" -f $openhandsHost)
    Set-EnvValue -Map $map -Key "CORE_RUNTIME_SSH_HOST" -Value $HostIp
    Set-EnvValue -Map $map -Key "CORE_DEPLOY_PROFILE" -Value "selfhosted"
    Set-EnvValue -Map $map -Key "CORE_DOCKER_CONTEXT" -Value "default"

    Set-EnvValue -Map $map -Key "OPENHANDS_PUBLIC_URL" -Value ("https://{0}" -f $openhandsHost)
    Set-EnvValue -Map $map -Key "OPENHANDS_API_URL" -Value "http://host.docker.internal:3000"
    Set-EnvValue -Map $map -Key "OPENHANDS_ADAPTER_URL" -Value "http://host.docker.internal:3001"
    Set-EnvValue -Map $map -Key "LANGGRAPH_API_URL" -Value "http://host.docker.internal:8080"
    Set-EnvValue -Map $map -Key "BOLTDIY_FACADE_URL" -Value "http://host.docker.internal:3901"

    Set-EnvValue -Map $map -Key "N8N_EDITOR_BASE_URL" -Value ("https://{0}" -f $n8nHost)
    Set-EnvValue -Map $map -Key "N8N_WEBHOOK_BASE_URL" -Value ("https://{0}/" -f $n8nHost)
    Set-EnvValue -Map $map -Key "N8N_WEBHOOK_URL" -Value ("https://{0}/webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission" -f $n8nHost)

    Set-EnvValue -Map $map -Key "ORACLE_ENABLED" -Value "false"
    Set-EnvValue -Map $map -Key "ORACLE_PLACEHOLDER" -Value "true"
    Set-EnvValue -Map $map -Key "ORACLE_RESERVED_FOR_FUTURE" -Value "true"
    Set-EnvValue -Map $map -Key "ORACLE_VERIFY_ENABLED" -Value "true"

    return @{
        map = $map
        openhands_host = $openhandsHost
        adapter_host = $adapterHost
        langgraph_host = $langgraphHost
        n8n_host = $n8nHost
        bolt_host = $boltHost
    }
}

function Write-EnvFile {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Map,
        [Parameter(Mandatory = $true)]
        [string]$OutPath
    )
    $lines = @()
    $keys = $Map.Keys | Sort-Object
    foreach ($k in $keys) {
        $v = [string]$Map[$k]
        $v = [regex]::Replace(
            $v,
            '\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)',
            {
                param($m)
                $name = if (-not [string]::IsNullOrWhiteSpace($m.Groups[1].Value)) {
                    $m.Groups[1].Value
                }
                else {
                    $m.Groups[2].Value
                }
                if ($Map.ContainsKey($name)) {
                    return [string]$Map[$name]
                }
                return $m.Value
            }
        )
        $safe = $v.Replace('"', '\"')
        $lines += ('export {0}="{1}"' -f $k, $safe)
    }
    Write-Utf8NoBomFile -Path $OutPath -Content ($lines -join "`n")
}

$fallbackMap = Parse-ExportFile -Path (Join-Path $RepoRoot ".godmode_env.example")
$localFallbackMap = Parse-ExportFile -Path (Join-Path $RepoRoot ".godmode_env")
foreach ($k in $localFallbackMap.Keys) {
    $fallbackMap[$k] = $localFallbackMap[$k]
}

if ([string]::IsNullOrWhiteSpace($SshPassword) -and $fallbackMap.ContainsKey("HETZNER_SSH_PASSWORD")) {
    $SshPassword = $fallbackMap["HETZNER_SSH_PASSWORD"]
}

if ([string]::IsNullOrWhiteSpace($SshHostKey) -and $fallbackMap.ContainsKey("HETZNER_SSH_HOSTKEY")) {
    $SshHostKey = $fallbackMap["HETZNER_SSH_HOSTKEY"]
}

if ([string]::IsNullOrWhiteSpace($HostIp)) {
    if ($fallbackMap.ContainsKey("HETZNER_HOST_IP")) {
        $HostIp = $fallbackMap["HETZNER_HOST_IP"]
    }
    else {
        $HostIp = "65.108.253.14"
    }
}

if ([string]::IsNullOrWhiteSpace($SshUser)) {
    if ($fallbackMap.ContainsKey("HETZNER_SSH_USER")) {
        $SshUser = $fallbackMap["HETZNER_SSH_USER"]
    }
    else {
        $SshUser = "root"
    }
}

if ([string]::IsNullOrWhiteSpace($FqdnRoot) -and $fallbackMap.ContainsKey("HETZNER_FQDN_ROOT")) {
    $FqdnRoot = $fallbackMap["HETZNER_FQDN_ROOT"]
}

if ([string]::IsNullOrWhiteSpace($TlsEmail) -and $fallbackMap.ContainsKey("HETZNER_TLS_EMAIL")) {
    $TlsEmail = $fallbackMap["HETZNER_TLS_EMAIL"]
}

$missingInputs = @()
if ([string]::IsNullOrWhiteSpace($HostIp) -or $HostIp -match '^replace-with-') { $missingInputs += "HostIp" }
if ([string]::IsNullOrWhiteSpace($SshUser) -or $SshUser -match '^replace-with-') { $missingInputs += "SshUser" }
if ([string]::IsNullOrWhiteSpace($FqdnRoot) -or $FqdnRoot -match '^replace-with-') { $missingInputs += "FqdnRoot" }
if ([string]::IsNullOrWhiteSpace($TlsEmail) -or $TlsEmail -match '^replace-with-') { $missingInputs += "TlsEmail" }

if ($missingInputs.Count -gt 0) {
    throw ("Missing required deploy values after fallback: {0}. Run with -HostIp/-SshUser/-FqdnRoot/-TlsEmail or set HETZNER_* in .godmode_env." -f ($missingInputs -join ", "))
}

$UsePlink = -not [string]::IsNullOrWhiteSpace($SshPassword)
$PlinkExecutable = ""
$PscpExecutable = ""

if ($UsePlink) {
    if ([string]::IsNullOrWhiteSpace($PlinkPath)) {
        $PlinkPath = Join-Path $PSScriptRoot "tools/plink.exe"
    }
    if ([string]::IsNullOrWhiteSpace($PscpPath)) {
        $PscpPath = Join-Path $PSScriptRoot "tools/pscp.exe"
    }

    $PlinkExecutable = Resolve-ExecutablePath -Preferred $PlinkPath -CommandName "plink"
    $PscpExecutable = Resolve-ExecutablePath -Preferred $PscpPath -CommandName "pscp"

    if ([string]::IsNullOrWhiteSpace($PlinkExecutable) -or [string]::IsNullOrWhiteSpace($PscpExecutable)) {
        throw "SshPassword mode requires plink/pscp. Provide -PlinkPath/-PscpPath or install PuTTY tools."
    }
    if ([string]::IsNullOrWhiteSpace($SshHostKey)) {
        throw "SshPassword mode requires -SshHostKey (or HETZNER_SSH_HOSTKEY) for non-interactive host-key pinning."
    }
}

$allPorts = @(22, 80, 443, 3000, 3001, 3901, 4000, 5678, 8080, 11434, 4173)
$portFacts = @()
foreach ($port in $allPorts) {
    $probe = Test-NetConnection $HostIp -Port $port -WarningAction SilentlyContinue
    $portFacts += @{
        port = $port
        tcp_open = [bool]$probe.TcpTestSucceeded
    }
}

$preflightPayload = @{
    timestamp = Get-IsoStamp
    host_ip = $HostIp
    ssh_user = $SshUser
    fqdn_root = $FqdnRoot
    tls_email = $TlsEmail
    ports = $portFacts
}
$preflightFile = Save-JsonEvidence -BaseName "hetzner_preflight" -Payload $preflightPayload

$skipRequested = [bool]$SkipRemoteApply
if ($skipRequested) {
    $skipped = @{
        timestamp = Get-IsoStamp
        status = "SKIPPED"
        host_ip = $HostIp
        reason = "SkipRemoteApply requested"
        preflight_file = $preflightFile
    }
    $skippedFile = Save-JsonEvidence -BaseName "hetzner_deploy" -Payload $skipped
    Write-Host ("SKIPPED: Remote apply skipped. Evidence: {0}" -f $skippedFile)
    exit 0
}

$authResult = Invoke-Ssh -RemoteCommand "echo HETZNER_AUTH_OK"
$authOk = ($authResult.exit_code -eq 0 -and $authResult.output -match "HETZNER_AUTH_OK")

if (-not $authOk) {
    $blocked = @{
        timestamp = Get-IsoStamp
        status = "BLOCKED"
        host_ip = $HostIp
        reason = "SSH authentication failed for deployment user"
        auth_exit_code = $authResult.exit_code
        auth_output = $authResult.output
        preflight_file = $preflightFile
    }
    $blockedFile = Save-JsonEvidence -BaseName "hetzner_deploy" -Payload $blocked
    Write-Host ("BLOCKED: SSH auth failed. Evidence: {0}" -f $blockedFile)
    exit 1
}

$envBuild = Build-HetznerEnvMap
$envMap = $envBuild.map
$openhandsHost = $envBuild.openhands_host
$adapterHost = $envBuild.adapter_host
$langgraphHost = $envBuild.langgraph_host
$n8nHost = $envBuild.n8n_host
$boltHost = $envBuild.bolt_host

$tempDir = Join-Path $env:TEMP ("godmode_hetzner_" + [guid]::NewGuid().ToString("N"))
New-Item -Path $tempDir -ItemType Directory -Force | Out-Null
$localEnvFile = Join-Path $tempDir "godmode_env.generated"
$localBootstrapFile = Join-Path $tempDir "bootstrap_hetzner_core.sh"

Write-EnvFile -Map $envMap -OutPath $localEnvFile

$bootstrapTemplate = @'
#!/usr/bin/env bash
set -euo pipefail

HOST_IP="__HOST_IP__"
FQDN_ROOT="__FQDN_ROOT__"
TLS_EMAIL="__TLS_EMAIL__"
GIT_REPO="__GIT_REPO__"
BRANCH="__BRANCH__"
REMOTE_PATH="__REMOTE_PATH__"
ENV_SOURCE="/tmp/godmode_env.generated"

OPENHANDS_HOST="openhands.${FQDN_ROOT}"
ADAPTER_HOST="adapter.${FQDN_ROOT}"
LANGGRAPH_HOST="langgraph.${FQDN_ROOT}"
N8N_HOST="n8n.${FQDN_ROOT}"
BOLT_HOST="bolt.${FQDN_ROOT}"

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl gnupg lsb-release git ufw nginx certbot python3-certbot-nginx

if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
  fi
  CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

mkdir -p "${REMOTE_PATH}"
if [ -d "${REMOTE_PATH}/.git" ]; then
  git -C "${REMOTE_PATH}" fetch origin "${BRANCH}"
  git -C "${REMOTE_PATH}" checkout "${BRANCH}"
  git -C "${REMOTE_PATH}" reset --hard "origin/${BRANCH}"
else
  rm -rf "${REMOTE_PATH}"
  git clone --depth 1 --branch "${BRANCH}" "${GIT_REPO}" "${REMOTE_PATH}"
fi

cp "${ENV_SOURCE}" "${REMOTE_PATH}/.godmode_env"
chmod 600 "${REMOTE_PATH}/.godmode_env"

cat > /etc/nginx/sites-available/godmode-core.conf <<NGINX
map \$http_upgrade \$connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 80;
  server_name ${OPENHANDS_HOST};
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
  }
}

server {
  listen 80;
  server_name ${ADAPTER_HOST};
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}

server {
  listen 80;
  server_name ${LANGGRAPH_HOST};
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}

server {
  listen 80;
  server_name ${N8N_HOST};
  location / {
    proxy_pass http://127.0.0.1:5678;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
  }
}

server {
  listen 80;
  server_name ${BOLT_HOST};
  location / {
    proxy_pass http://127.0.0.1:3901;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
NGINX

ln -sfn /etc/nginx/sites-available/godmode-core.conf /etc/nginx/sites-enabled/godmode-core.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

certbot --nginx --non-interactive --agree-tos --email "${TLS_EMAIL}" --redirect \
  -d "${OPENHANDS_HOST}" \
  -d "${ADAPTER_HOST}" \
  -d "${LANGGRAPH_HOST}" \
  -d "${N8N_HOST}" \
  -d "${BOLT_HOST}"

cat > /etc/nginx/sites-available/godmode-core.conf <<NGINX_TLS
map \$http_upgrade \$connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 80;
  server_name ${OPENHANDS_HOST} ${ADAPTER_HOST} ${LANGGRAPH_HOST} ${N8N_HOST} ${BOLT_HOST};
  return 301 https://\$host\$request_uri;
}

server {
  listen 443 ssl;
  server_name ${OPENHANDS_HOST};
  ssl_certificate /etc/letsencrypt/live/${OPENHANDS_HOST}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${OPENHANDS_HOST}/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
  }
}

server {
  listen 443 ssl;
  server_name ${ADAPTER_HOST};
  ssl_certificate /etc/letsencrypt/live/${OPENHANDS_HOST}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${OPENHANDS_HOST}/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}

server {
  listen 443 ssl;
  server_name ${LANGGRAPH_HOST};
  ssl_certificate /etc/letsencrypt/live/${OPENHANDS_HOST}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${OPENHANDS_HOST}/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}

server {
  listen 443 ssl;
  server_name ${N8N_HOST};
  ssl_certificate /etc/letsencrypt/live/${OPENHANDS_HOST}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${OPENHANDS_HOST}/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
  location / {
    proxy_pass http://127.0.0.1:5678;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
  }
}

server {
  listen 443 ssl;
  server_name ${BOLT_HOST};
  ssl_certificate /etc/letsencrypt/live/${OPENHANDS_HOST}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${OPENHANDS_HOST}/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
  location / {
    proxy_pass http://127.0.0.1:3901;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
NGINX_TLS

nginx -t
systemctl reload nginx

ufw --force default deny incoming
ufw --force default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

cd "${REMOTE_PATH}"
chmod +x ./START_GODMODE.sh
bash ./START_GODMODE.sh

mkdir -p "${REMOTE_PATH}/.godmode_runtime/evidence"
python3 - <<PY
import json
from datetime import datetime, timezone
from pathlib import Path

payload = {
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "status": "PASS",
    "host_ip": "${HOST_IP}",
    "fqdn_root": "${FQDN_ROOT}",
    "domains": {
        "openhands": "${OPENHANDS_HOST}",
        "adapter": "${ADAPTER_HOST}",
        "langgraph": "${LANGGRAPH_HOST}",
        "n8n": "${N8N_HOST}",
        "bolt": "${BOLT_HOST}",
    },
    "firewall_public_ports": [22, 80, 443],
    "services_internal_ports": [3000, 3001, 3901, 4000, 5678, 8080, 11434, 4173],
}

evidence_dir = Path("${REMOTE_PATH}") / ".godmode_runtime" / "evidence"
stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S-%f%z")
target = evidence_dir / f"hetzner_remote_{stamp}.json"
latest = evidence_dir / "hetzner_remote_latest.json"
target.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")
latest.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")
print(str(target))
PY
'@

$bootstrapContent = $bootstrapTemplate.Replace("__HOST_IP__", $HostIp).Replace("__FQDN_ROOT__", $FqdnRoot).Replace("__TLS_EMAIL__", $TlsEmail).Replace("__GIT_REPO__", $GitRepoUrl).Replace("__BRANCH__", $Branch).Replace("__REMOTE_PATH__", $RemotePath)
Write-Utf8NoBomFile -Path $localBootstrapFile -Content $bootstrapContent

$mkTmp = Invoke-Ssh -RemoteCommand "mkdir -p /tmp"
if ($mkTmp.exit_code -ne 0) {
    throw ("Remote /tmp preparation failed: {0}" -f $mkTmp.output)
}

$scpEnv = Invoke-Scp -LocalPath $localEnvFile -RemotePathFull "/tmp/godmode_env.generated"
if ($scpEnv.exit_code -ne 0) {
    throw ("Uploading env file failed: {0}" -f $scpEnv.output)
}

$scpBoot = Invoke-Scp -LocalPath $localBootstrapFile -RemotePathFull "/tmp/bootstrap_hetzner_core.sh"
if ($scpBoot.exit_code -ne 0) {
    throw ("Uploading bootstrap script failed: {0}" -f $scpBoot.output)
}

$chmod = Invoke-Ssh -RemoteCommand "chmod +x /tmp/bootstrap_hetzner_core.sh"
if ($chmod.exit_code -ne 0) {
    throw ("Remote chmod failed: {0}" -f $chmod.output)
}

$bootstrapCommand = "bash -lc '/tmp/bootstrap_hetzner_core.sh > /tmp/bootstrap_run.log 2>&1'; code=`$?; tail -n 200 /tmp/bootstrap_run.log; exit `$code"
$bootstrapRun = Invoke-Ssh -RemoteCommand $bootstrapCommand
if ($bootstrapRun.exit_code -ne 0) {
    $failed = @{
        timestamp = Get-IsoStamp
        status = "BLOCKED"
        host_ip = $HostIp
        fqdn_root = $FqdnRoot
        reason = "Remote bootstrap script failed"
        bootstrap_exit_code = $bootstrapRun.exit_code
        bootstrap_output = $bootstrapRun.output
        preflight_file = $preflightFile
    }
    $failedFile = Save-JsonEvidence -BaseName "hetzner_deploy" -Payload $failed
    Write-Host ("BLOCKED: Remote bootstrap failed. Evidence: {0}" -f $failedFile)
    exit 1
}

$externalChecks = @()
foreach ($host in @($openhandsHost, $adapterHost, $langgraphHost, $n8nHost, $boltHost)) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri ("https://{0}" -f $host) -TimeoutSec 20
        $externalChecks += @{
            host = $host
            url = ("https://{0}" -f $host)
            ok = $true
            status_code = [int]$r.StatusCode
        }
    }
    catch {
        $externalChecks += @{
            host = $host
            url = ("https://{0}" -f $host)
            ok = $false
            error = $_.Exception.Message
        }
    }
}

$securityPorts = @(3000, 3001, 3901, 4000, 5678, 8080, 11434, 4173)
$securityChecks = @()
foreach ($p in $securityPorts) {
    $probe = Test-NetConnection $HostIp -Port $p -WarningAction SilentlyContinue
    $securityChecks += @{
        port = $p
        externally_open = [bool]$probe.TcpTestSucceeded
    }
}

$failedHttpsChecks = @($externalChecks | Where-Object { -not $_.ok })
$openServicePorts = @($securityChecks | Where-Object { $_.externally_open })

if ($failedHttpsChecks.Count -gt 0 -or $openServicePorts.Count -gt 0) {
    $blocked = @{
        timestamp = Get-IsoStamp
        status = "BLOCKED"
        host_ip = $HostIp
        fqdn_root = $FqdnRoot
        reason = "Post-deploy gate checks failed"
        failed_https_checks = $failedHttpsChecks
        open_service_ports = $openServicePorts
        preflight_file = $preflightFile
    }
    $blockedFile = Save-JsonEvidence -BaseName "hetzner_deploy" -Payload $blocked
    Write-Host ("BLOCKED: Post-deploy gates failed. Evidence: {0}" -f $blockedFile)
    exit 1
}

$deployPayload = @{
    timestamp = Get-IsoStamp
    status = "PASS"
    host_ip = $HostIp
    fqdn_root = $FqdnRoot
    deploy_profile = "selfhosted"
    ssh_user = $SshUser
    preflight_file = $preflightFile
    domains = @{
        openhands = $openhandsHost
        adapter = $adapterHost
        langgraph = $langgraphHost
        n8n = $n8nHost
        bolt = $boltHost
    }
    external_https_checks = $externalChecks
    service_port_security_checks = $securityChecks
}

$deployFile = Save-JsonEvidence -BaseName "hetzner_deploy" -Payload $deployPayload
Write-Host ("PASS: Hetzner selfhosted deploy completed. Evidence: {0}" -f $deployFile)
