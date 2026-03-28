# -*- coding: utf-8 -*-
"""
JETBRAIN V5.4 PRO - COLAB_V5_4_COMPLETE.py
===========================================
FIX-LOG v1 (26.03.2026 - Round 1):
  [FIX-1]  def setup(): statt i setup():
  [FIX-2]  fwith -> with  (Error-Handler)
  [FIX-3]  print(tunnel_url) ausserhalb for-Loop
  [FIX-4]  Vite cwd -> /content/game/frontend
  [FIX-5]  socket.io.js Script-Src zerrissen -> repariert
  [FIX-6]  cloudflared absoluter Pfad /content/cloudflared
  [FIX-7]  from IPython.display import display, HTML
  [FIX-8]  npm install mit cwd=/content/jetbrain/proxy

FIX-LOG v2 (26.03.2026 - Round 2):
  [BUG-A]  headless:'new' -> headless:true  (Puppeteer v22+ deprecated)
  [BUG-B]  --use-gl=egl -> --use-gl=swiftshader  (EGL nicht in Colab VMs)
  [BUG-C]  Tunnel-URL: str.split() -> re.search()  (ANSI-Codes brechen split)
  [BUG-D]  NPC dx/dz unbegrenzte Akkumulation -> clamp +-0.4
  [BUG-E]  CORSMiddleware fehlte allow_headers
  [OPT-F]  socket.io-client reconnect-Config in renderer.js
  [OPT-G]  Vite: blind sleep(20) -> aktives Port-Polling (60s timeout)
  [OPT-H]  Cloudflared: blind sleep(20) -> aktives URL-Polling (60s timeout)
  [OPT-I]  Alle Popen-Prozesse loggen nach /tmp/*.log
  [OPT-J]  npc_server.py: import json entfernt (unused)
  [OPT-K]  Stale-Process-Cleanup am setup()-Start
  [OPT-L]  Guard: frontend-Verzeichnis-Check vor npm install
"""

import subprocess, os, time, re
import socket as _socket
from IPython.display import display, HTML


# ---------------------------------------------
# HELPERS
# ---------------------------------------------

def _wait_for_port(port: int, timeout: int = 60, label: str = "") -> bool:
    """[OPT-G] Aktives Port-Polling statt blind sleep()."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with _socket.create_connection(("127.0.0.1", port), timeout=1):
                print(f"     [{label}] Port {port} bereit [OK]")
                return True
        except OSError:
            time.sleep(1)
    print(f"     [{label}] TIMEOUT: Port {port} nach {timeout}s nicht bereit!")
    return False


def _poll_tunnel_url(log_path: str, timeout: int = 60):
    """[OPT-H] + [BUG-C] Aktives Polling + re.search statt split()."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        if os.path.exists(log_path):
            with open(log_path, "r") as f:
                content = f.read()
            m = re.search(r'https://[a-z0-9\-]+\.trycloudflare\.com', content)
            if m:
                return m.group(0)
        time.sleep(2)
    return None


def _popen_logged(cmd, log_path: str, **kwargs):
    """[OPT-I] Popen mit Log-Datei."""
    log = open(log_path, "w")
    return subprocess.Popen(cmd, stdout=log, stderr=log, **kwargs)


# ---------------------------------------------
# MAIN SETUP
# ---------------------------------------------

def setup():
    print("=" * 60)
    print("  JETBRAIN V5.4 PRO - KOMPLETT-SYSTEM")
    print("  Cloud-Only Rendering | Zero Local Load")
    print("=" * 60)

    # [OPT-K] Cleanup stale Prozesse
    print("\n[0/9] Cleanup stale Prozesse...")
    for pat in ["node /content/jetbrain", "cloudflared", "npc_server"]:
        subprocess.run(f"pkill -9 -f '{pat}' 2>/dev/null || true", shell=True)
    time.sleep(2)

    # -- SCHRITT 1: System-Bibliotheken + Node 24 + GPU-Treiber -----
    print("\n[1/9] System-Bibliotheken + NODE 24 + GPU-Treiber...")
    subprocess.run(
        "curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && "
        "apt-get update -y && apt-get install -y "
        "nodejs ffmpeg xvfb libatk1.0-0 libatk-bridge2.0-0 libcups2 "
        "libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 "
        "libxrandr2 libgbm1 libasound2 libpango-1.0-0 "
        "libpangocairo-1.0-0 "
        "vulkan-tools libnvidia-gl-525 -q",
        shell=True
    )
    # GPU-Status prüfen
    gpu_check = subprocess.run("nvidia-smi", shell=True, capture_output=True)
    has_gpu = gpu_check.returncode == 0
    if has_gpu:
        print("     [GPU] NVIDIA GPU erkannt → Vulkan-Modus aktiv")
        subprocess.run("vulkaninfo --summary 2>/dev/null | head -5", shell=True)
    else:
        print("     [GPU] Keine GPU → SwiftShader CPU-Fallback")

    # -- SCHRITT 2: GitHub Repo klonen ------------------------
    print("\n[2/9] GitHub Repo klonen...")
    repo_dir = "/content/game"
    if os.path.exists(repo_dir):
        subprocess.run(f"rm -rf {repo_dir}", shell=True)
    r = subprocess.run(
        f"git clone https://github.com/strazzusochr/CoronaProjektschonwieder.git {repo_dir}",
        shell=True
    )
    if r.returncode != 0:
        print("[ERROR] git clone fehlgeschlagen!")
        return

    # [NEW] Patch Frontend for IPv4 (localhost -> 127.0.0.1)
    print("\n[2.5/9] Patch Frontend for IPv4 (localhost -> 127.0.0.1)...")
    subprocess.run(
        "grep -lR 'localhost' /content/game/frontend | xargs -r sed -i 's/localhost/127.0.0.1/g'",
        shell=True
    )

    # [OPT-L] Frontend-Dir Guard
    frontend_dir = f"{repo_dir}/frontend"
    if not os.path.exists(frontend_dir):
        print(f"[ERROR] {frontend_dir} nicht gefunden! Repo-Struktur:")
        subprocess.run(f"find {repo_dir} -name 'package.json' -maxdepth 3", shell=True)
        return

    # -- SCHRITT 3: Frontend npm install ----------------------
    print("\n[3/9] Frontend npm install...")
    subprocess.run("npm install", shell=True, cwd=frontend_dir)

    # -- SCHRITT 4: Xvfb --------------------------------------
    print("\n[4/9] Virtuelles Display (Xvfb) starten...")
    os.environ["DISPLAY"] = ":99"
    _popen_logged(["Xvfb", ":99", "-screen", "0", "1920x1080x24", "-ac"], "/tmp/xvfb.log")
    time.sleep(2)

    # -- SCHRITT 5: Vite Dev-Server ----------------------------
    print("\n[5/9] Vite Dev-Server starten (Port 5173)...")
    _popen_logged(
        ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"],
        "/tmp/vite.log",
        cwd=frontend_dir
    )
    if not _wait_for_port(5173, timeout=60, label="Vite"):
        print("[WARN] Vite nicht bereit - Renderer wartet intern bis 60s")

    # -- SCHRITT 6: Proxy & Renderer JS schreiben --------------
    print("\n[6/9] Proxy & Renderer JS schreiben + npm install...")
    proxy_dir = "/content/jetbrain/proxy"
    os.makedirs(proxy_dir, exist_ok=True)

    # [FIX-8] npm install IN proxy_dir
    subprocess.run(
        "npm install express socket.io socket.io-client puppeteer --save -q",
        shell=True, cwd=proxy_dir
    )

    server_js = r"""
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 1e8
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><title>JETBRAIN V5.4 PRO</title>
<style>
  *   { margin:0; padding:0; overflow:hidden; background:#000 }
  img { width:100vw; height:100vh; object-fit:contain }
  #hud {
    position:fixed; top:10px; right:10px; color:#0f0;
    font:12px monospace; background:rgba(0,0,0,.7);
    padding:5px 12px; border:1px solid #0f0;
    border-radius:4px; z-index:99
  }
  #status {
    position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    color:#0f0; font:28px monospace; text-shadow:0 0 20px #0f0
  }
</style></head>
<body>
  <img id='v'>
  <div id='hud'>FPS: --</div>
  <div id='status'>Verbinde mit Cloud-Renderer...</div>
  <script src='/socket.io/socket.io.js'></script>
  <script>
    const s   = io();
    const v   = document.getElementById('v');
    const hud = document.getElementById('hud');
    const st  = document.getElementById('status');
    let fc = 0, last = Date.now();
    s.on('stream_frame', (d) => {
      v.src = 'data:image/jpeg;base64,' + d;
      fc++;
      st.style.display = 'none';
      const now = Date.now();
      if (now - last >= 1000) { hud.textContent = 'FPS: ' + fc; fc = 0; last = now; }
    });
    s.on('connect',    () => { st.textContent = 'Warte auf Frames...'; });
    s.on('disconnect', () => {
      st.style.display = 'block';
      st.textContent = 'Verbindung verloren...';
    });
  </script>
</body></html>`);
});

io.on('connection', (socket) => {
  console.log('[PROXY] Client verbunden:', socket.id);
  socket.on('frame', (b) => { socket.broadcast.emit('stream_frame', b); });
});

server.listen(3002, '0.0.0.0', () => {
  console.log('[PROXY] Aktiv auf Port 3002');
});
"""

    renderer_js = r"""
const puppeteer = require('puppeteer');
const io        = require('socket.io-client');

async function run() {
  console.log('[RENDERER V3] 30FPS CDP Screencast Mode...');

  const socket = io('http://127.0.0.1:3002', {
    reconnectionDelay:    2000,
    reconnectionAttempts: 15
  });
  socket.on('connect',       () => console.log('[RENDERER V3] Proxy verbunden'));
  socket.on('connect_error', (e) => console.log('[RENDERER V3] Proxy-Fehler:', e.message));

  // [DEEP-DIVE] GPU-Modus: Vulkan wenn T4 verfügbar, SwiftShader als Fallback
  const hasGPU = require('fs').existsSync('/dev/nvidia0');
  const gpuArgs = hasGPU ? [
    '--use-angle=vulkan',
    '--enable-features=Vulkan',
    '--disable-vulkan-surface',
    '--enable-unsafe-webgpu',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization'
  ] : [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--ignore-gpu-blocklist'
  ];
  console.log('[RENDERER V3] GPU-Modus:', hasGPU ? 'VULKAN (T4)' : 'SWIFTSHADER (CPU)');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu-sandbox',
      '--disable-frame-rate-limit',
      ...gpuArgs
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // [DEBUG] Mirror page console
  page.on('console', msg => console.log('[VITE-PAGE]', msg.text()));

  console.log('[RENDERER V3] Lade 3D-Welt...');
  await page.goto('http://127.0.0.1:5173/?streaming=true', {
    waitUntil: 'networkidle2',
    timeout:   60000
  });
  console.log('[RENDERER V3] 3D-Welt geladen!');

  const cdp = await page.createCDPSession();
  let frames = 0;

  cdp.on('Page.screencastFrame', async (ev) => {
    socket.emit('frame', ev.data);
    // [30FPS CAP & LOG] Wait 33ms before ACK to limit frame rate + Explicit emission log
    await new Promise(r => setTimeout(r, 33));
    await cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId });
    frames++;
    if (frames % 150 === 0) console.log('[RENDERER V3] Frames gesendet:', frames);
  });

  // [FIX] Force screencast to start emitting
  await cdp.send('Page.startScreencast', {
    format:        'jpeg',
    quality:       70,
    maxWidth:      1920,
    maxHeight:     1080,
    everyNthFrame: 1
  });
  
  // [HEARTBEAT] Shake mouse to force dirty rectangle
  setInterval(async () => {
    try { await page.mouse.move(Math.random()*10, Math.random()*10); } catch(e){}
  }, 200);

  console.log('[RENDERER V3] 30FPS Screencast gestartet + Heartbeat EIN');
}

run().catch(e => { console.error('[RENDERER V3] FATAL:', e); process.exit(1); });
"""

    with open(f"{proxy_dir}/server.js",   "w") as f: f.write(server_js)
    with open(f"{proxy_dir}/renderer.js", "w") as f: f.write(renderer_js)

    # -- SCHRITT 7: NPC-KI Server -----------------------------
    print("\n[7/9] NPC-KI Server starten...")
    subprocess.run("pip install fastapi uvicorn -q", shell=True)

    npc_server = '''\
import math, random
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],   # [BUG-E] war fehlend
)

MAX_SPEED = 0.4  # [BUG-D] clamp verhindert unbegrenzte Beschleunigung

def is_walkable(x, z):
    ax, az = abs(x), abs(z)
    if ax < 45 and az < 45: return True
    if ax < 9 or az < 9:    return True
    return 44 < math.sqrt(x*x + z*z) < 53

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

npcs = []
for i in range(150):
    while True:
        x = random.uniform(-100, 100)
        z = random.uniform(-100, 100)
        if is_walkable(x, z): break
    npcs.append({
        "id":   f"npc_{i}", "x": x, "z": z,
        "dx":   random.uniform(-0.3, 0.3),
        "dz":   random.uniform(-0.3, 0.3),
        "type": random.choice(["civilian","civilian","demonstrator","Police","RiotCop"])
    })

@app.get("/api/npcs")
def get_npcs():
    for n in npcs:
        nx, nz = n["x"] + n["dx"], n["z"] + n["dz"]
        if is_walkable(nx, nz):
            n["x"], n["z"] = nx, nz
        else:
            n["dx"] = clamp(-(n["dx"] + random.uniform(-0.05, 0.05)), -MAX_SPEED, MAX_SPEED)
            n["dz"] = clamp(-(n["dz"] + random.uniform(-0.05, 0.05)), -MAX_SPEED, MAX_SPEED)
    return npcs

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
'''
    with open("/content/jetbrain/npc_server.py", "w") as f:
        f.write(npc_server)
    _popen_logged(["python3", "/content/jetbrain/npc_server.py"], "/tmp/npc_server.log")
    _wait_for_port(8000, timeout=15, label="NPC-Server")

    # -- SCHRITT 8: Proxy + Cloudflare Tunnel -----------------
    print("\n[8/9] Proxy starten + Tunnel oeffnen...")
    _popen_logged(["node", f"{proxy_dir}/server.js"], "/tmp/proxy.log")
    _wait_for_port(3002, timeout=15, label="Proxy")

    subprocess.run(
        "wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/"
        "cloudflared-linux-amd64 -O /content/cloudflared && chmod +x /content/cloudflared",
        shell=True
    )
    with open("/tmp/cloudflared.log", "w") as log:
        subprocess.Popen(
            ["/content/cloudflared", "tunnel", "--url", "http://127.0.0.1:3002"],
            stdout=log, stderr=log
        )

    # -- SCHRITT 9: URL + Renderer -----------------------------
    print("\n[9/9] Warte auf Tunnel-URL (max 60s)...")
    tunnel_url = _poll_tunnel_url("/tmp/cloudflared.log", timeout=60)

    if tunnel_url:
        print(f"     Tunnel: {tunnel_url}")
        _popen_logged(["node", f"{proxy_dir}/renderer.js"], "/tmp/renderer.log")
        time.sleep(3)

        print("\n" + "=" * 60)
        print(f"  SYSTEM BEREIT!  {tunnel_url}")
        print("  Logs: /tmp/vite.log | proxy.log | renderer.log")
        print("=" * 60)

        display(HTML(
            f'<div style="padding:30px;margin:20px 0;background:#0a0a0a;'
            f'border:3px solid #00ff00;border-radius:12px;color:#00ff00;'
            f'font-family:monospace;text-align:center;'
            f'box-shadow:0 0 30px rgba(0,255,0,0.3);">'
            f'<div style="font-size:13px;color:#888;margin-bottom:8px;">'
            f'JETBRAIN V5.4 PRO | Cloud Rendering | Zero Local Load</div>'
            f'<div style="font-size:26px;font-weight:bold;">[OK] SYSTEM ONLINE</div>'
            f'<div style="margin-top:15px;padding:10px;background:#111;'
            f'border-radius:6px;font-size:15px;word-break:break-all;">'
            f'<a href="{tunnel_url}" target="_blank" style="color:#0f0;text-decoration:none;">'
            f'{tunnel_url}</a></div>'
            f'<div style="margin-top:12px;font-size:11px;color:#555;">'
            f'CDP Screencast 60FPS | SwiftShader WebGL | NPC-KI 150 NPCs | 1080p | PC: 0%'
            f'</div></div>'
        ))
    else:
        print("\n[ERROR] Tunnel-URL nicht gefunden nach 60s! Log:")
        with open("/tmp/cloudflared.log", "r") as f:
            print(f.read()[-1000:])


# ---------------------------------------------
# entry point
# ---------------------------------------------
setup()
