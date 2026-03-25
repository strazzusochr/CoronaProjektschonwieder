/**
 * JETBRAIN V4 — UNIFIED CLOUD SERVER
 * 
 * Runs on HuggingFace Spaces (Docker) — Port 7860
 * 
 * This single process handles:
 * 1. Static Frontend serving (from /app/frontend/dist)
 * 2. Socket.IO backend (simulation data)
 * 3. MJPEG Stream Proxy (receives frames from headless Chrome)
 * 4. Headless Chromium with SwiftShader (renders the 3D scene)
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// ═══════════════════════════════════════════════════════════
// UNIFIED SOCKET.IO — handles both simulation and stream
// ═══════════════════════════════════════════════════════════
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true }
});

// ═══════════════════════════════════════════════════════════
// STATIC FRONTEND — serve the built React app
// ═══════════════════════════════════════════════════════════
const distPath = join(__dirname, '..', 'frontend', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log('[CLOUD] Serving static frontend from', distPath);
} else {
  console.warn('[CLOUD] No dist/ found — frontend not built yet');
}

// Health check endpoint for HuggingFace
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'JETBRAIN V4 Cloud', uptime: process.uptime() });
});

// ═══════════════════════════════════════════════════════════
// SIMULATION ENGINE (imported from backend)
// ═══════════════════════════════════════════════════════════

// Simple inline simulation (avoids complex TS compilation on HF)
let gameTimeSeconds = 6 * 3600; // Start at 06:00
let simSpeed = 1;
let isPaused = false;

const PHASES = [
  { start: 0, end: 6, label: 'Nacht', ambient: 0.1 },
  { start: 6, end: 8, label: 'Morgengrauen', ambient: 0.4 },
  { start: 8, end: 10, label: 'Breakfast Rush', ambient: 0.7 },
  { start: 10, end: 12, label: 'Demo-Formierung', ambient: 0.9 },
  { start: 12, end: 14, label: 'Ultimatum', ambient: 1.0 },
  { start: 14, end: 18, label: 'Eskalation', ambient: 0.8 },
  { start: 18, end: 22, label: 'Riot Night', ambient: 0.3 },
  { start: 22, end: 24, label: 'Aftermath', ambient: 0.15 }
];

function getCurrentPhase() {
  const h = Math.floor(gameTimeSeconds / 3600) % 24;
  const phase = PHASES.find(p => h >= p.start && h < p.end) || PHASES[0];
  return { label: phase.label, period: `${phase.start}:00-${phase.end}:00`, ambient: phase.ambient };
}

function getTimeString() {
  const totalSec = gameTimeSeconds % 86400;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

// NPC Pool
let npcPool = {};
const NPC_TYPES = ['civilian', 'demonstrator', 'Police', 'RiotCop'];

function spawnNPCs() {
  const h = Math.floor(gameTimeSeconds / 3600) % 24;
  const targetCount = h < 6 ? 5 : h < 10 ? 30 : h < 14 ? 80 : h < 18 ? 120 : 50;
  const currentCount = Object.keys(npcPool).length;
  
  if (currentCount < targetCount) {
    for (let i = 0; i < Math.min(5, targetCount - currentCount); i++) {
      const id = `npc_${Date.now()}_${i}`;
      const type = h > 12 && Math.random() > 0.7 ? 'Police' : 
                   h > 10 && Math.random() > 0.5 ? 'demonstrator' : 'civilian';
      npcPool[id] = {
        id, type,
        position: [(Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20],
        action: type === 'Police' ? 'PATROL' : 'WANDER',
        mood: 'NEUTRAL'
      };
    }
  }
  
  // Move NPCs
  Object.values(npcPool).forEach(npc => {
    npc.position[0] += (Math.random() - 0.5) * 0.15;
    npc.position[2] += (Math.random() - 0.5) * 0.15;
  });
}

// Tension
let tension = 0;

// Simulation loop
setInterval(() => {
  if (isPaused) return;
  gameTimeSeconds += simSpeed;
  
  spawnNPCs();
  
  const h = Math.floor(gameTimeSeconds / 3600) % 24;
  tension = Math.min(100, Math.max(0, h > 12 ? (h - 12) * 15 : h * 2));
  
  const npcTypeCount = {};
  Object.values(npcPool).forEach(npc => {
    npcTypeCount[npc.type] = (npcTypeCount[npc.type] || 0) + 1;
  });
  
  io.emit('world_update', {
    time: getTimeString(),
    phase: getCurrentPhase(),
    npcs: npcPool,
    bakeryState: h >= 6 ? 'OPEN' : 'CLOSED',
    tension,
    emergencyLevel: tension > 80 ? 'CRITICAL' : 'NORMAL',
    npcTypeCount,
    simSpeed,
    isPaused
  });
}, 2000);

// ═══════════════════════════════════════════════════════════
// STREAM PROXY — receives frames from headless Chrome
// ═══════════════════════════════════════════════════════════
io.on('connection', (socket) => {
  console.log('[CLOUD] Client connected:', socket.id);
  
  socket.emit('initial_sync', {
    npcs: npcPool,
    time: getTimeString(),
    phase: getCurrentPhase(),
    bakeryState: 'OPEN'
  });
  
  // Renderer sends frames
  socket.on('frame', (base64Frame) => {
    socket.broadcast.emit('stream_frame', base64Frame);
  });
  
  socket.on('set_sim_speed', (speed) => {
    simSpeed = speed;
    console.log(`[CLOUD] Speed: ${speed}x`);
  });
  
  socket.on('toggle_sim_pause', () => {
    isPaused = !isPaused;
    console.log(`[CLOUD] ${isPaused ? 'PAUSED' : 'RESUMED'}`);
  });
  
  socket.on('request_ai_action', () => {
    io.emit('npc_update', npcPool);
  });
  
  socket.on('disconnect', () => {
    console.log('[CLOUD] Client disconnected');
  });
});

// ═══════════════════════════════════════════════════════════
// HEADLESS RENDERER — SwiftShader Chrome (renders the 3D scene)
// ═══════════════════════════════════════════════════════════
async function startRenderer() {
  try {
    const puppeteer = await import('puppeteer-core');
    
    const browser = await puppeteer.default.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-gl=swiftshader',
        '--use-angle=swiftshader-webgl',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-zygote',
        '--single-process',
        '--mute-audio',
        '--hide-scrollbars',
        `--display=${process.env.DISPLAY || ':99'}`
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('[RENDERER] Headless Chrome started with SwiftShader');
    
    // Connect to our own Socket.IO to send frames
    const rendererSocket = ioClient('http://localhost:7860');
    
    // Navigate to the frontend (which will have the 3D canvas for the renderer)
    await page.goto('http://localhost:7860', { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('[RENDERER] Scene loaded — streaming frames at 10 FPS');
    
    // Capture and stream frames
    setInterval(async () => {
      try {
        const buffer = await page.screenshot({ type: 'jpeg', quality: 40 });
        rendererSocket.emit('frame', buffer.toString('base64'));
      } catch (e) {
        // Ignore transient errors
      }
    }, 100); // 10 FPS
    
  } catch (err) {
    console.error('[RENDERER] Failed to start:', err.message);
    console.log('[RENDERER] System will work without live 3D stream (HUD-only mode)');
  }
}

// ═══════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════
const PORT = process.env.PORT || 7860;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  JETBRAIN V4 — CLOUD SERVER ACTIVE            ║`);
  console.log(`║  Port: ${PORT}                                   ║`);
  console.log(`║  Mode: Zero-Load Cloud Renderer               ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
  
  // Start the headless renderer after a short delay
  setTimeout(startRenderer, 5000);
});

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h1>JETBRAIN V4 — Building...</h1><p>Frontend is being compiled. Refresh in 30 seconds.</p>');
  }
});
