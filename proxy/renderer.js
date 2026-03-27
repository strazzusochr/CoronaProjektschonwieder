/**
 * JETBRAIN V4 — CLOUD-ONLY HEADLESS RENDERER
 * 
 * CRITICAL: This script MUST ONLY run on a cloud server (Oracle/AWS/Vagon).
 * It launches a headless Chromium instance that renders the 3D scene
 * and streams JPEG frames to the proxy server.
 * 
 * SAFETY: Will REFUSE to start on Windows (home PC) to prevent thermal damage.
 */

const puppeteer = require('puppeteer');
const io = require('socket.io-client');
const os = require('os');

async function launchRenderer() {
  // ═══════════════════════════════════════════════════════════
  // ABSOLUTE SAFETY BLOCK — NEVER RENDER ON HOME PC
  // ═══════════════════════════════════════════════════════════
  const platform = os.platform();
  if (platform === 'win32') {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════════╗');
    console.error('║  ❌ FATAL: LOCAL RENDERING BLOCKED                       ║');
    console.error('║                                                          ║');
    console.error('║  This renderer MUST run on a CLOUD SERVER (Linux).       ║');
    console.error('║  Running on Windows (home PC) causes 94°C CPU overheat. ║');
    console.error('║                                                          ║');
    console.error('║  Deploy to Oracle Cloud / AWS / Vagon first.             ║');
    console.error('║  See: CLOUD_SPECIFICATION_V4_PRO.md                      ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }

  // Connect to the Stream Proxy
  const socket = io('http://localhost:3002');

  socket.on('connect', () => {
    console.log('V4 PRO: Cloud GPU connected to Stream Proxy');
  });

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=swiftshader',
      '--use-angle=swiftshader-webgl',
      '--enable-webgpu-developer-features',
      '--disable-gpu-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-zygote',
      '--single-process',
      '--mute-audio',
      '--hide-scrollbars'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 }); // AAA 1080p Resolution

  console.log('V4 PRO: Initializing Heavy Cloud Rendering Scene (1080p, 60fps)...');
  await page.goto('http://localhost:5173/?renderer=true', { waitUntil: 'load' });

  console.log('V4 PRO: Headless Renderer Active - Streaming High-Poly Scene at 60 FPS');

  // AAA Screenshot Loop (60 FPS Target)
  // NOTE: On Colab, x11grab is preferred for true 60fps.
  setInterval(async () => {
    try {
      const buffer = await page.screenshot({ 
        type: 'jpeg', 
        quality: 75, // Higher quality for AAA
        optimizeForSpeed: true 
      });
      socket.emit('frame', buffer.toString('base64'));
    } catch(e) {
      // Ignore
    }
  }, 1000 / 60);
}

launchRenderer().catch(console.error);
