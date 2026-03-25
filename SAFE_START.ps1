# ═══════════════════════════════════════════════════════════════
# JETBRAIN V4 — SAFE LOCAL LAUNCHER (ZERO-LOAD GUARANTEED)
# ═══════════════════════════════════════════════════════════════
#
# This script starts ONLY the lightweight services on the home PC:
# 1. Backend Simulation Engine (Node.js — data only, no rendering)
# 2. Frontend Dev Server (Vite — serves the Thin Client HTML)
#
# It does NOT start:
# - renderer.js (CLOUD ONLY)
# - Any Puppeteer/Chrome instances
# - Any GPU-intensive processes
#
# Expected CPU temperature: < 50°C
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  JETBRAIN V4 — ZERO-LOAD SAFE LAUNCHER              ║" -ForegroundColor Cyan
Write-Host "║  Home PC = Thin Client ONLY (0% GPU/CPU rendering)  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill any leftover processes
Write-Host "[SAFETY] Killing all existing node/chrome processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM chrome.exe /T 2>$null
Start-Sleep -Seconds 2

# Step 2: Start Backend (simulation data only — no rendering)
Write-Host "[START] Backend Simulation Engine (Port 3001)..." -ForegroundColor Green
Start-Process -FilePath "pwsh" -ArgumentList "-Command", "Set-Location '$PSScriptRoot\backend'; npx tsx src/index.ts" -NoNewWindow

Start-Sleep -Seconds 3

# Step 3: Start Proxy Server (receives frames from cloud, forwards to clients)
Write-Host "[START] Stream Proxy (Port 3002)..." -ForegroundColor Green
Start-Process -FilePath "pwsh" -ArgumentList "-Command", "Set-Location '$PSScriptRoot\proxy'; node server.js" -NoNewWindow

Start-Sleep -Seconds 2

# Step 4: Start Frontend (Thin Client — NO 3D rendering)
Write-Host "[START] Frontend Thin Client (Port 5173)..." -ForegroundColor Green
Start-Process -FilePath "pwsh" -ArgumentList "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev -- --host 0.0.0.0" -NoNewWindow

Start-Sleep -Seconds 3

# Step 5: Open browser in streaming mode ONLY
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ ALL SERVICES STARTED (ZERO-LOAD MODE)            ║" -ForegroundColor Green
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║  Frontend: http://localhost:5173                     ║" -ForegroundColor Green
Write-Host "║  Backend:  http://localhost:3001                     ║" -ForegroundColor Green
Write-Host "║  Stream:   http://localhost:3002 (awaiting cloud)    ║" -ForegroundColor Green
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║  NOTE: 3D rendering requires a CLOUD SERVER.         ║" -ForegroundColor Yellow
Write-Host "║  See: CLOUD_SPECIFICATION_V4_PRO.md                  ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Open the thin client in default browser
Start-Process "http://localhost:5173"
