[CmdletBinding()]
param(
    [string]$EnvFile = ".godmode_env",
    [string]$RotatedHetznerTokenAt = "",
    [string]$RotatedHfTokenAt = "",
    [string]$RotatedGithubTokenAt = "",
    [string]$RotatedRootPasswordAt = "",
    [switch]$SetNowAll
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-AbsolutePath {
    param([Parameter(Mandatory = $true)][string]$PathLike)
    $candidate = if ([System.IO.Path]::IsPathRooted($PathLike)) {
        $PathLike
    } else {
        Join-Path (Get-Location) $PathLike
    }
    return [System.IO.Path]::GetFullPath($candidate)
}

function Upsert-ExportLine {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyString()][string[]]$Lines,
        [Parameter(Mandatory = $true)][string]$Key,
        [Parameter(Mandatory = $true)][string]$Value
    )

    $pattern = "^\s*export\s+{0}\s*=" -f [Regex]::Escape($Key)
    $newLine = "export {0}=""{1}""" -f $Key, ($Value -replace '"', '\"')
    $updated = $false

    for ($i = 0; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i] -match $pattern) {
            $Lines[$i] = $newLine
            $updated = $true
            break
        }
    }

    if (-not $updated) {
        $Lines += $newLine
    }
    return ,$Lines
}

$absoluteEnvPath = Resolve-AbsolutePath -PathLike $EnvFile
if (-not (Test-Path -LiteralPath $absoluteEnvPath)) {
    throw "Env file not found: $absoluteEnvPath"
}

$lines = [System.Collections.Generic.List[string]]::new()
Get-Content -LiteralPath $absoluteEnvPath -Encoding UTF8 | ForEach-Object {
    $lines.Add($_)
}

$nowIso = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
if ($SetNowAll) {
    if ([string]::IsNullOrWhiteSpace($RotatedHetznerTokenAt)) { $RotatedHetznerTokenAt = $nowIso }
    if ([string]::IsNullOrWhiteSpace($RotatedHfTokenAt)) { $RotatedHfTokenAt = $nowIso }
    if ([string]::IsNullOrWhiteSpace($RotatedGithubTokenAt)) { $RotatedGithubTokenAt = $nowIso }
    if ([string]::IsNullOrWhiteSpace($RotatedRootPasswordAt)) { $RotatedRootPasswordAt = $nowIso }
}

if (-not [string]::IsNullOrWhiteSpace($RotatedHetznerTokenAt)) {
    $lines = Upsert-ExportLine -Lines $lines.ToArray() -Key "ROTATED_HETZNER_TOKEN_AT" -Value $RotatedHetznerTokenAt
}
if (-not [string]::IsNullOrWhiteSpace($RotatedHfTokenAt)) {
    $lines = Upsert-ExportLine -Lines $lines -Key "ROTATED_HF_TOKEN_AT" -Value $RotatedHfTokenAt
}
if (-not [string]::IsNullOrWhiteSpace($RotatedGithubTokenAt)) {
    $lines = Upsert-ExportLine -Lines $lines -Key "ROTATED_GITHUB_TOKEN_AT" -Value $RotatedGithubTokenAt
}
if (-not [string]::IsNullOrWhiteSpace($RotatedRootPasswordAt)) {
    $lines = Upsert-ExportLine -Lines $lines -Key "ROTATED_ROOT_PASSWORD_AT" -Value $RotatedRootPasswordAt
}

[System.IO.File]::WriteAllLines($absoluteEnvPath, $lines, [System.Text.UTF8Encoding]::new($false))

$result = [ordered]@{
    status = "ok"
    env_file = $absoluteEnvPath
    rotated_hetzner_token_at = $RotatedHetznerTokenAt
    rotated_hf_token_at = $RotatedHfTokenAt
    rotated_github_token_at = $RotatedGithubTokenAt
    rotated_root_password_at = $RotatedRootPasswordAt
}

$result | ConvertTo-Json -Depth 4
