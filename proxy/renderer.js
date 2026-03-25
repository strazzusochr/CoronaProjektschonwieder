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
  await page.setViewport({ width: 1280, height: 720 });

  console.log('V4 PRO: Initializing Heavy Cloud Rendering Scene...');
  await page.goto('http://localhost:5173/?renderer=true', { waitUntil: 'load' });

  console.log('V4 PRO: Headless Renderer Active - Streaming Video to Thin Clients');

  // MJPEG Screenshot Loop (~15 FPS)
  setInterval(async () => {
    try {
      const buffer = await page.screenshot({ type: 'jpeg', quality: 50 });
      socket.emit('frame', buffer.toString('base64'));
    } catch(e) {
      // Ignore context-destroyed errors during hot-reload
    }
  }, 1000 / 15);
}

launchRenderer().catch(console.error);
