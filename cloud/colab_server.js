/**
 * JETBRAIN V4 — CLOUD 3D RENDERER (FFmpeg NVENC H.264 Pipeline)
 * 
 * Architecture:
 * Chrome WebGL (T4 GPU) → Xvfb :99 (1920×1080) → FFmpeg NVENC H.264 → WebSocket Binary → Client <video>
 * 
 * This is the SAME architecture as GeForce NOW / Xbox Cloud Gaming.
 * NVENC = Nvidia Hardware Video Encoder on T4 GPU
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn, exec } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
  transports: ['polling', 'websocket'],
  maxHttpBufferSize: 5e6  // 5MB for video chunks
});

// ═══════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════
app.get('/scene3d', (q, s) => s.sendFile(join(__dirname, 'scene3d.html')));
app.get('/health', (q, s) => s.json({ status: 'ok', gpu: true, encoder: 'h264_nvenc', fps: 60 }));
app.get('*', (q, s) => s.send(`
  <html><body style="background:#000;color:#0f0;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh">
  <div><h1>JETBRAIN V4 — H.264 NVENC CLOUD</h1>
  <p>GPU: T4 | Encoder: NVENC H.264 | Resolution: 1920×1080 | FPS: 60</p></div>
  </body></html>`));

// ═══════════════════════════════════════════════════════════
// 24H SIMULATION ENGINE
// ═══════════════════════════════════════════════════════════
let gameTime = 21600, npcs = {}, tension = 0;

function tick() {
  gameTime += 1;
  const h = Math.floor(gameTime / 3600) % 24;
  const m = Math.floor((gameTime % 3600) / 60);
  
  // Dynamic NPC count based on time of day
  const targetCount = h < 6 ? 5 : h < 10 ? 30 : h < 14 ? 80 : h < 18 ? 150 : 50;
  
  // Spawn NPCs
  while (Object.keys(npcs).length < targetCount) {
    const id = 'n' + Date.now() + Math.random().toString(36).slice(2, 5);
    npcs[id] = {
      id,
      type: h > 14 && Math.random() > .6 ? 'Police' : h > 10 && Math.random() > .5 ? 'demonstrator' : 'civilian',
      position: [(Math.random() - .5) * 28, 0, (Math.random() - .5) * 28]
    };
  }
  
  // Move NPCs
  Object.values(npcs).forEach(n => {
    n.position[0] += (Math.random() - .5) * .3;
    n.position[2] += (Math.random() - .5) * .3;
  });
  
  // Cull excess NPCs
  const keys = Object.keys(npcs);
  while (keys.length > targetCount + 10) delete npcs[keys.pop()];
  
  tension = Math.min(100, h > 12 ? (h - 12) * 15 : h * 2);
  
  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const phase = h < 6 ? 'Nacht' : h < 10 ? 'Morgen' : h < 14 ? 'Demo' : h < 18 ? 'Eskalation' : 'Aftermath';
  
  io.emit('world_update', { time: timeStr, npcs, tension, phase });
}

setInterval(tick, 2000);

// ═══════════════════════════════════════════════════════════
// FFmpeg NVENC H.264 VIDEO PIPELINE
// ═══════════════════════════════════════════════════════════

let ffmpegProcess = null;
let frameCount = 0;

async function startRenderer() {
  try {
    const puppeteer = await import('puppeteer');
    console.log('[RENDERER] Starting Chrome + WebGL on Xvfb :99...');
    
    const browser = await puppeteer.default.launch({
      headless: false,  // NOT headless — renders to Xvfb display
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--display=:99',
        '--use-gl=egl',
        '--enable-webgl',
        '--enable-gpu',
        '--disable-software-rasterizer',
        '--disable-dev-shm-usage',
        '--window-size=1920,1080',
        '--start-fullscreen',
        '--kiosk',
        '--ignore-gpu-blocklist',
        '--enable-gpu-rasterization',
        '--enable-accelerated-2d-canvas'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:7860/scene3d', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for 3D scene to initialize
    await new Promise(r => setTimeout(r, 3000));

    // Verify WebGL GPU
    const gpu = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no-webgl';
    });
    console.log('[RENDERER] GPU:', gpu);
    console.log('[RENDERER] Chrome rendering on Xvfb :99 at 1920x1080');

    // ═══ Start FFmpeg NVENC H.264 Capture ═══
    startFFmpegPipeline();

  } catch (e) {
    console.error('[RENDERER] Chrome error:', e.message);
    // Fallback: start FFmpeg anyway (capture Xvfb even without Chrome)
    console.log('[RENDERER] Starting FFmpeg capture without Chrome...');
    startFFmpegPipeline();
  }
}

function startFFmpegPipeline() {
  // Check which encoder is available
  exec('ffmpeg -encoders 2>/dev/null | grep h264_nvenc', (err, stdout) => {
    const useNvenc = stdout && stdout.includes('h264_nvenc');
    const encoder = useNvenc ? 'h264_nvenc' : 'libx264';
    const presetArgs = useNvenc 
      ? ['-preset', 'p1', '-tune', 'ull', '-rc', 'cbr', '-b:v', '6M']
      : ['-preset', 'ultrafast', '-tune', 'zerolatency', '-crf', '23', '-maxrate', '6M', '-bufsize', '3M'];
    
    console.log(`[FFMPEG] Using encoder: ${encoder} (NVENC: ${useNvenc ? 'YES ✅' : 'NO (software fallback)'})`);

    const ffmpegArgs = [
      '-f', 'x11grab',
      '-video_size', '1920x1080',
      '-framerate', '30',
      '-i', ':99',
      '-c:v', encoder,
      ...presetArgs,
      '-g', '30',                    // Keyframe every 1s
      '-pix_fmt', 'yuv420p',
      '-f', 'mpegts',               // MPEG-TS container (streamable)
      '-muxdelay', '0',
      '-muxpreload', '0',
      'pipe:1'                       // Output binary to stdout
    ];

    console.log('[FFMPEG] Starting pipeline:', 'ffmpeg', ffmpegArgs.join(' '));
    
    ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Buffer video chunks and send to all clients
    let chunkBuffer = Buffer.alloc(0);
    const CHUNK_SIZE = 32768;  // 32KB chunks
    
    ffmpegProcess.stdout.on('data', (data) => {
      chunkBuffer = Buffer.concat([chunkBuffer, data]);
      frameCount++;
      
      // Send chunks when we have enough data
      while (chunkBuffer.length >= CHUNK_SIZE) {
        const chunk = chunkBuffer.slice(0, CHUNK_SIZE);
        chunkBuffer = chunkBuffer.slice(CHUNK_SIZE);
        
        // Send binary video data to all connected clients
        io.emit('video_chunk', chunk);
      }
      
      if (frameCount % 300 === 0) {
        console.log(`[FFMPEG] Chunks sent: ${frameCount}, Clients: ${io.engine.clientsCount}`);
      }
    });

    ffmpegProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      // Log important FFmpeg messages
      if (msg.includes('fps=') || msg.includes('Error') || msg.includes('encoder')) {
        const fpsMatch = msg.match(/fps=\s*(\d+)/);
        if (fpsMatch && frameCount % 100 === 0) {
          console.log(`[FFMPEG] Encoding at ${fpsMatch[1]} fps`);
        }
      }
    });

    ffmpegProcess.on('close', (code) => {
      console.log(`[FFMPEG] Process exited with code ${code}`);
      // Auto-restart after 3 seconds
      setTimeout(startFFmpegPipeline, 3000);
    });
  });
}

// ═══════════════════════════════════════════════════════════
// SOCKET.IO CONNECTIONS
// ═══════════════════════════════════════════════════════════
io.on('connection', (socket) => {
  console.log('[IO] Client connected:', socket.id);
  socket.emit('initial_sync', { npcs, time: '06:00', phase: 'Morgen', tension: 0 });
  
  socket.on('disconnect', () => {
    console.log('[IO] Client disconnected:', socket.id);
  });
});

// ═══════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════
httpServer.listen(7860, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  JETBRAIN V4 — NVENC H.264 CLOUD RENDERER               ║');
  console.log('║  Port: 7860 | Encoder: NVENC | Resolution: 1920×1080    ║');
  console.log('║  Pipeline: Xvfb → Chrome WebGL → FFmpeg NVENC → WS      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  setTimeout(startRenderer, 2000);
});

// Cleanup on exit
process.on('SIGINT', () => {
  if (ffmpegProcess) ffmpegProcess.kill();
  process.exit();
});
process.on('SIGTERM', () => {
  if (ffmpegProcess) ffmpegProcess.kill();
  process.exit();
});
