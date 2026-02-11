const express = require('express');
const compression = require('compression');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");
const db = require('./server/database.cjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*", // PRODUCTION: Set CORS_ORIGIN env var!
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8080;
const distPath = path.join(__dirname, 'dist');
const ONE_YEAR = 31536000;

app.use(compression());

app.get('/health', (_, res) => res.status(200).send('ok'));

// Trust proxy for Hugging Face
app.set('trust proxy', 1);

// --- SECURITY HEADERS ---
app.use((req, res, next) => {
    // TEMPORARY: Extremely permissive CSP for deep-dive debugging
    res.setHeader(
        "Content-Security-Policy",
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
        "script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
        "connect-src * 'unsafe-inline' 'unsafe-eval' data: blob: wss:; " +
        "img-src * data: blob:; " +
        "style-src * 'unsafe-inline'; " +
        "font-src * data:; " +
        "frame-src *; " +
        "worker-src * blob:; " +
        "object-src 'none';"
    );
    
    // Enforce Cross-Origin Isolation (Needed for SharedArrayBuffer/Rapier/WebGPU)
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');

    // Ensure .wasm and .js correct MIME
    if (req.path.endsWith('.wasm')) {
        res.type('application/wasm');
    } else if (req.path.endsWith('.js') || req.path.endsWith('.mjs')) {
        res.type('application/javascript');
    }
    next();
});

// Robust Asset Routing: BEFORE static/spa fallback
// If an asset is requested but doesn't exist, return 404, NOT index.html
app.use(['/assets', '/src', '/node_modules'], (req, res, next) => {
    const fullPath = path.join(distPath, req.baseUrl, req.path);
    // Note: Simple check, express.static is better but this is for the "index.html fallback" trap
    next();
});

// Static serving mit gezielten Cache-Headern
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.glb') || filePath.endsWith('.ktx2') || filePath.endsWith('.wasm')) {
      res.setHeader('Cache-Control', `public, max-age=${ONE_YEAR}, immutable`);
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.endsWith('.js')) {
      res.type('application/javascript');
    }
  }
}));

// SPA-Fallback (React Router) - ONLY for non-file requests
app.get('*', (req, res) => {
  // Prevent fallback for files (anything with a dot in the last segment)
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    return res.status(404).send('Not Found');
  }
  if (req.path.startsWith('/socket.io')) return;
  res.sendFile(path.join(distPath, 'index.html'));
});

// --- MULTIPLAYER LOGIK ---
const players = new Map();
let tensionLevel = 0;
const MAX_DISTANCE_PER_TICK = 5.0;

function validateMovement(oldPos, newPos) {
    if (!oldPos) return true;
    const dx = newPos[0] - oldPos[0];
    const dy = newPos[1] - oldPos[1];
    const dz = newPos[2] - oldPos[2];
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    return dist <= MAX_DISTANCE_PER_TICK;
}

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);
  if (db && typeof db.updateUser === 'function') db.updateUser(socket.id, { online: true });

  players.set(socket.id, {
    id: socket.id,
    position: [0, 2, 0],
    rotation: [0, 0, 0],
    health: 100,
    lastUpdate: Date.now(),
    violations: 0
  });

  socket.emit("gameState", {
    players: Array.from(players.values()),
    tension: tensionLevel,
    highscores: db && typeof db.getHighscores === 'function' ? db.getHighscores() : []
  });

  socket.broadcast.emit("playerJoined", { id: socket.id });

  socket.on("updatePosition", (data) => {
    if (players.has(socket.id)) {
      const p = players.get(socket.id);
      if (validateMovement(p.position, data.pos)) {
          p.position = data.pos;
          p.rotation = data.rot;
          p.lastUpdate = Date.now();
          socket.broadcast.emit("playerMoved", { id: socket.id, pos: data.pos, rot: data.rot });
      } else {
          p.violations = (p.violations || 0) + 1;
          console.warn(`⚠️ Violation from ${socket.id} (${p.violations}/5)`);
          
          if (p.violations >= 5) {
              console.log(`🚫 KICKING Player ${socket.id} for cheating.`);
              socket.emit("kick", { reason: "Speed Hack detected" });
              socket.disconnect();
          } else {
              socket.emit("correction", { pos: p.position });
          }
      }
    }
  });

  // Cloud Save Events (Integrated from server/server.js)
  socket.on("cloudSave", (saveData) => {
      console.log(`☁️ Cloud Save from ${socket.id}`);
      if (db && typeof db.saveCloudData === 'function') {
          db.saveCloudData(socket.id, saveData);
          socket.emit("cloudSaveSuccess");
      }
  });

  socket.on("getCloudSave", () => {
      if (db && typeof db.getCloudData === 'function') {
          const data = db.getCloudData(socket.id);
          socket.emit("cloudData", data);
      }
  });

  socket.on("disconnect", () => {
    players.delete(socket.id);
    if (db && typeof db.updateUser === 'function') db.updateUser(socket.id, { online: false });
    io.emit("playerLeft", { id: socket.id });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Robust Production Server running on port ${PORT}`);
});
