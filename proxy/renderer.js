const puppeteer = require('puppeteer');
const io = require('socket.io-client');

async function launchRenderer() {
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
      '--use-gl=angle',
      '--use-angle=vulkan', // WebGPU Hardware Acceleration Proxy
      '--disable-gpu-vsync', // Maximize framerate
      '--mute-audio',
      '--hide-scrollbars'
    ]
  });
  
  const page = await browser.newPage();
  
  // Set consistent 720p for smooth MJPEG streaming bandwidth
  await page.setViewport({ width: 1280, height: 720 });
  
  // Point to the Heavy Render Mode of the Frontend
  console.log('V4 PRO: Initializing Heavy Cloud Rendering Scene...');
  await page.goto('http://localhost:5173/?renderer=true', { waitUntil: 'load' });
  
  console.log('V4 PRO: Headless Renderer Active - Streaming Video to Thin Clients');
  
  // High-Performance MJPEG Screenshot Loop (~15 FPS)
  // Dies garantiert 0% GPU/CPU Last auf dem Endgerät (User)
  setInterval(async () => {
    try {
      const buffer = await page.screenshot({ type: 'jpeg', quality: 50 });
      socket.emit('frame', buffer.toString('base64'));
    } catch(e) {
      // Ignore Navigation/Context Destroyed errors during hot-reload
    }
  }, 1000 / 15); // ~66ms per frame = 15 FPS
}

launchRenderer().catch(console.error);
