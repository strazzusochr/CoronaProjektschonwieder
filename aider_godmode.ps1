param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$AiderArgs
)

# GODMODE Aider Launcher (Docker Edition)
# Ersetzt die Notwendigkeit für lokale Python-Abhängigkeiten! 

# Umgebungsvariablen aus .godmode_env laden falls vorhanden
if (Test-Path "$PSScriptRoot\.godmode_env") {
    $env_vars = Get-Content "$PSScriptRoot\.godmode_env"
    foreach ($line in $env_vars) {
        if ($line -match "^export\s+([^=]+)=(.*)$") {
            $key = $matches[1]
            $value = $matches[2] -replace '^"|"$', ''
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

if (-not $env:AIDER_MODEL) {
    $env:AIDER_MODEL = "openrouter/anthropic/claude-sonnet-4-5"
}

if (-not $env:AIDER_WEAK_MODEL) {
    $env:AIDER_WEAK_MODEL = "openrouter/deepseek/deepseek-chat-v3-0324"
}

if (-not $env:AIDER_MAP_TOKENS) {
    $env:AIDER_MAP_TOKENS = "8192"
}

$DefaultArgs = @(
    "--architect"
    "--editor-model", $env:AIDER_WEAK_MODEL
    "--model", $env:AIDER_MODEL
    "--map-tokens", $env:AIDER_MAP_TOKENS
    "--map-refresh", "always"
    "--auto-lint"
    "--yes-always"
    "--no-check-update"
    "--no-show-model-warnings"
)

$EffectiveArgs = @()
if ($AiderArgs.Count -gt 0) {
    $EffectiveArgs = $AiderArgs
} else {
    $EffectiveArgs = $DefaultArgs
}

Write-Host "🚀 STARTING GODMODE AIDER (DOCKER)..." -ForegroundColor Cyan

docker run -it --rm `
  -v ${PWD}:/app `
  -e ANTHROPIC_API_KEY=$env:ANTHROPIC_API_KEY `
  -e OPENROUTER_API_KEY=$env:OPENROUTER_API_KEY `
  -e OPENAI_BASE_URL=$env:OPENAI_BASE_URL `
  -e AIDER_MODEL=$env:AIDER_MODEL `
  -e AIDER_WEAK_MODEL=$env:AIDER_WEAK_MODEL `
  aiderchat/aider @EffectiveArgs
