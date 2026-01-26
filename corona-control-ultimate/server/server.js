/**
 * Corona Control Ultimate - Multiplayer Server
 * Phase 22: WebSocket Server
 */
const { Server } = require("socket.io");
const http = require("http");
const db = require("./database");

const PORT = 3005;
console.log(`Starting Multiplayer Server on port ${PORT}...`);

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Game State
const players = new Map(); // socket.id -> { position, rotation, health, lastUpdate }
let tensionLevel = 0;

// Validation Constants
const MAX_SPEED = 20.0; // Units per second (approx)
const MAX_DISTANCE_PER_TICK = 5.0; // Allowed jump distance per update (generous)

function validateMovement(oldPos, newPos) {
    if (!oldPos) return true;
    const dx = newPos[0] - oldPos[0];
    const dy = newPos[1] - oldPos[1];
    const dz = newPos[2] - oldPos[2];
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    // Simple speed check
    if (dist > MAX_DISTANCE_PER_TICK) {
        console.warn(`⚠️ Speed Hack detected? Dist: ${dist.toFixed(2)}`);
        return false;
    }
    return true;
}

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Load or Create User in DB
  const dbUser = db.updateUser(socket.id, { online: true });

  // Init Player
  players.set(socket.id, {
    id: socket.id,
    position: [0, 2, 0],
    rotation: [0, 0, 0],
    health: 100,
    lastUpdate: Date.now()
  });

  // Send current state to new player
  socket.emit("gameState", {
    players: Array.from(players.values()),
    tension: tensionLevel,
    highscores: db.getHighscores()
  });

  // Broadcast new player
  socket.broadcast.emit("playerJoined", { id: socket.id });

  // Handle Movement Updates (Authoritative Check)
  socket.on("updatePosition", (data) => {
    if (players.has(socket.id)) {
      const p = players.get(socket.id);
      
      // Validate
      if (validateMovement(p.position, data.pos)) {
          p.position = data.pos;
          p.rotation = data.rot;
          p.lastUpdate = Date.now();
          
          // Broadcast
          socket.broadcast.emit("playerMoved", { id: socket.id, pos: data.pos, rot: data.rot });
      } else {
          // Violation detected
          let violations = players.get(socket.id).violations || 0;
          violations++;
          players.get(socket.id).violations = violations;
          
          console.warn(`⚠️ Violation from ${socket.id} (${violations}/5)`);

          if (violations >= 5) {
              console.log(`🚫 KICKING Player ${socket.id} for cheating.`);
              socket.emit("kick", { reason: "Speed Hack detected" });
              socket.disconnect();
          } else {
              // Correction: Send valid position back to client (Rubberbanding)
              socket.emit("correction", { pos: p.position });
          }
      }
    }
  });

  // Cloud Save Events
  socket.on("cloudSave", (saveData) => {
      console.log(`☁️ Cloud Save from ${socket.id}`);
      db.saveCloudData(socket.id, saveData);
      socket.emit("cloudSaveSuccess");
  });

  socket.on("getCloudSave", () => {
      const data = db.getCloudData(socket.id);
      socket.emit("cloudData", data);
  });

  // Handle Disconnect
  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    players.delete(socket.id);
    db.updateUser(socket.id, { online: false }); // Mark offline
    io.emit("playerLeft", { id: socket.id });
  });
});

server.listen(PORT, () => {
  console.log(`✅ Authoritative Server running on http://localhost:${PORT}`);
});
