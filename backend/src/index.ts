import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  }
});

// V4 NPC Pool (In-Memory für dieses Reset)
interface NPC {
  id: string;
  position: [number, number, number];
  action: string;
  mood: string;
  type: string;
}

let npcPool: Record<string, NPC> = {
  'npc_1': { id: 'npc_1', position: [2, 0, 2], action: 'WANDER', mood: 'NEUTRAL', type: 'civilian' },
  'npc_2': { id: 'npc_2', position: [-2, 0, -2], action: 'IDLE', mood: 'CALM', type: 'demonstrator' },
  'npc_3': { id: 'npc_3', position: [5, 0, -3], action: 'PATROL', mood: 'FOCUSED', type: 'official' }
};

// Cloud Logic: Forward to Python AI Engine
const AI_ENGINE_URL = 'http://localhost:8000';

io.on('connection', (socket) => {
  console.log('--- V4 PRO CLIENT CONNECTED:', socket.id);
  
  // Sofortige Synchronisation des aktuellen Welt-Status
  socket.emit('initial_sync', npcPool);

  // Forward request to Python AI
  socket.on('request_ai_action', async (data) => {
    try {
      // Wir senden den gesamten Pool an die Python Engine
      const response = await axios.post(`${AI_ENGINE_URL}/decide_npcs`, {
        npcs: npcPool,
        environment: { tension: 0.1 }
      });
      
      const updatedNpcs = response.data.updated_npcs;
      
      // Pool aktualisieren
      npcPool = { ...npcPool, ...updatedNpcs };
      
      // Update an ALLE Clients senden (Broadcast)
      io.emit('npc_update', updatedNpcs);
      console.log('--- V4 NPC POOL UPDATED & BROADCASTED');
      
    } catch (error) {
      console.error('--- AI ENGINE CONNECTION ERROR:', (error as any).message);
      socket.emit('ai_error', { message: 'AI Engine unreachable' });
    }
  });

  socket.on('disconnect', () => {
    console.log('--- V4 PRO CLIENT DISCONNECTED');
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`V4 Backend running on port ${PORT}`);
});
