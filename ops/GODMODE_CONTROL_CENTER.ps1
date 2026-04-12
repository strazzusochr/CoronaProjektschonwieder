[CmdletBinding()]
param(
    [ValidateSet("menu", "start-stack", "dev-3d", "gates-3d", "verify-runtime", "status")]
    [string]$Action = "menu"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$FrontendRoot = Join-Path $RepoRoot "CoronaProjektschonwieder"

function Invoke-Step {
    param(
        [string]$Label,
        [scriptblock]$Step
    )

    Write-Host ""
    Write-Host "=== $Label ===" -ForegroundColor Cyan
    & $Step
    Write-Host "OK  $Label" -ForegroundColor Green
}

function Start-LocalStack {
    Invoke-Step -Label "START_GODMODE.ps1" -Step {
        & (Join-Path $RepoRoot "START_GODMODE.ps1")
    }
}

function Start-3DDevServer {
    Invoke-Step -Label "npm install" -Step {
        Push-Location $FrontendRoot
        try {
            npm install
            if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
        }
        finally {
            Pop-Location
        }
    }

    Write-Host ""
    Write-Host "Starte jetzt den 3D Dev-Server auf http://127.0.0.1:5173 ..." -ForegroundColor Yellow
    Push-Location $FrontendRoot
    try {
        npm run dev -- --host 127.0.0.1 --port 5173
    }
    finally {
        Pop-Location
    }
}

function Run-3DGates {
    Invoke-Step -Label "npm install" -Step {
        Push-Location $FrontendRoot
        try {
            npm install
            if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
        }
        finally {
            Pop-Location
        }
    }

    Invoke-Step -Label "npm test" -Step {
        Push-Location $FrontendRoot
        try {
            npm test
            if ($LASTEXITCODE -ne 0) { throw "npm test failed." }
        }
        finally {
            Pop-Location
        }
    }

    Invoke-Step -Label "npm run build" -Step {
        Push-Location $FrontendRoot
        try {
            npm run build
            if ($LASTEXITCODE -ne 0) { throw "npm run build failed." }
        }
        finally {
            Pop-Location
        }
    }

    Invoke-Step -Label "npm run test:browser" -Step {
        Push-Location $FrontendRoot
        try {
            npm run test:browser
            if ($LASTEXITCODE -ne 0) { throw "npm run test:browser failed." }
        }
        finally {
            Pop-Location
        }
    }
}

function Run-RuntimeVerification {
    Invoke-Step -Label "verify_bolt_facade.py" -Step {
        Push-Location $RepoRoot
        try {
            py -3 verify_bolt_facade.py
            if ($LASTEXITCODE -ne 0) { throw "verify_bolt_facade.py failed." }
        }
        finally {
            Pop-Location
        }
    }

    Invoke-Step -Label "verify_hf_runtime.py" -Step {
        Push-Location $RepoRoot
        try {
            py -3 verify_hf_runtime.py
            if ($LASTEXITCODE -ne 0) { throw "verify_hf_runtime.py failed." }
        }
        finally {
            Pop-Location
        }
    }

    Invoke-Step -Label "oracle_probe.py" -Step {
        Push-Location $RepoRoot
        try {
            py -3 oracle_probe.py
            if ($LASTEXITCODE -ne 0) { throw "oracle_probe.py failed." }
        }
        finally {
            Pop-Location
        }
    }
}

function Show-Status {
    Write-Host ""
    Write-Host "Repo: $RepoRoot" -ForegroundColor Cyan
    Write-Host "Frontend: $FrontendRoot" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Lokale Haupt-URLs:" -ForegroundColor Yellow
    Write-Host " - 3D Dev (Vite):            http://127.0.0.1:5173"
    Write-Host " - OpenHands:                http://127.0.0.1:3000"
    Write-Host " - OpenHands Adapter:        http://127.0.0.1:3001"
    Write-Host " - bolt-facade:              http://127.0.0.1:3901"
    Write-Host " - LiteLLM:                  http://127.0.0.1:4000"
    Write-Host " - n8n:                      http://127.0.0.1:5678"
    Write-Host " - LangGraph:                http://127.0.0.1:8080"
    Write-Host ""
    Write-Host "Nutzerdoku: $RepoRoot\BEGINNER_DEV_PLAYBOOK_3D_AND_APPS.md" -ForegroundColor Green
}

function Invoke-Action {
    param([string]$SelectedAction)

    switch ($SelectedAction) {
        "start-stack" { Start-LocalStack; return }
        "dev-3d" { Start-3DDevServer; return }
        "gates-3d" { Run-3DGates; return }
        "verify-runtime" { Run-RuntimeVerification; return }
        "status" { Show-Status; return }
        default {
            throw "Unknown action: $SelectedAction"
        }
    }
}

if ($Action -ne "menu") {
    Invoke-Action -SelectedAction $Action
    exit 0
}

while ($true) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor DarkCyan
    Write-Host " GODMODE CONTROL CENTER (Beginner Mode)" -ForegroundColor DarkCyan
    Write-Host "========================================" -ForegroundColor DarkCyan
    Write-Host "1) Starte kompletten lokalen GODMODE-Stack"
    Write-Host "2) Starte 3D-Game Dev-Server"
    Write-Host "3) Fuehre komplette 3D-Qualitaetsgates aus"
    Write-Host "4) Fuehre Runtime-Verifikation aus"
    Write-Host "5) Zeige System-Status + URLs"
    Write-Host "0) Beenden"
    $choice = Read-Host "Bitte Zahl eingeben"

    try {
        switch ($choice) {
            "1" { Invoke-Action -SelectedAction "start-stack" }
            "2" { Invoke-Action -SelectedAction "dev-3d" }
            "3" { Invoke-Action -SelectedAction "gates-3d" }
            "4" { Invoke-Action -SelectedAction "verify-runtime" }
            "5" { Invoke-Action -SelectedAction "status" }
            "0" { break }
            default { Write-Host "Ungueltige Eingabe." -ForegroundColor Red }
        }
    }
    catch {
        Write-Host "FEHLER: $($_.Exception.Message)" -ForegroundColor Red
    }
}
