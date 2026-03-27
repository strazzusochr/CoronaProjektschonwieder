import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { EventScheduler } from './eventScheduler.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true }
});

const scheduler = new EventScheduler();

// V4 NPC Pool (In-Memory)
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

import { updateSocialBehaviors } from './socialLogic.js';

// ... (Rest bleibt gleich bis Intervall)

import { globalShiftManager } from './systems/PoliceShiftManager.js';
import { globalTensionManager } from './systems/TensionManager.js';
import { triggerPeakEvent } from './systems/sekEvent.js';
import { globalStoryManager } from './systems/StoryManager24h.js';

let bakeryState = 'CLOSED';
let peakActive = false;

// Simulation Loop (1 Tick = 5 Spielminuten für schnelleren Test)
setInterval(() => {
  scheduler.update(1); // 1 Minute pro Tick (Realistischer)
  const phase = scheduler.getCurrentPhase();
  const time = scheduler.getTimeString();
  const gameSeconds = scheduler.getGameTimeSeconds();
  const currentHour = Math.floor(gameSeconds / 3600) % 24;

  // 1. Master 24H Story Event Engine
  const storyData = globalStoryManager.evaluateEvents(gameSeconds, npcPool);
  npcPool = storyData.npcs;
  bakeryState = storyData.bakeryState;
  
  // 2. Social Logic Update
  npcPool = updateSocialBehaviors(npcPool);

  // 3. Police Routines & Shift Change
  const npcArray = Object.values(npcPool);
  const shiftResult = globalShiftManager.evaluateShifts(currentHour, npcArray as any);
  
  // Merge Story Actions into UI Notifications
  shiftResult.actions.push(...storyData.actions);
  
  // Phase 11: Escalation Metrics (Tension)
  const tensionResult = globalTensionManager.evaluateTension(npcArray as any);
  
  // Zwinge Peak für schnelles Testing (kann später entfernt werden)
  // if (currentHour === 14 && !peakActive) tensionResult.peakTriggerFired = true; 

  if (tensionResult.peakTriggerFired && !peakActive) {
      console.log(`[TENSION CRITICAL] 100% Chaos Factor reached at ${time}! Preparing SEK Response Phase 12...`);
      peakActive = true;
      const sekResult = triggerPeakEvent(npcPool as any);
      npcPool = sekResult.npcs as any;
      shiftResult.actions.push(...sekResult.actions);
      
      // Clear Peak after 2 in-game hours automatically
      setTimeout(() => { peakActive = false; }, 120000); 
  }
  
  // Apply Spawns
  shiftResult.npcsToSpawn.forEach(npc => {
     npcPool[npc.id!] = npc as any;
  });
  
  // Apply Despawns (End of Shift)
  shiftResult.npcsToDespawn.forEach(id => {
     delete npcPool[id];
  });
  
  if (shiftResult.actions.length > 0) {
      console.log(`[SHIFT LOG] ${time}:`, shiftResult.actions.join(' | '));
  }

  // Calculate Detailed Telemetry for HUD (using the LATEST pool)
  const currentNpcArray = Object.values(npcPool);
  const npcTypeCount = currentNpcArray.reduce((acc, npc) => {
    acc[npc.type] = (acc[npc.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  io.emit('world_update', {
    time: time,
    phase: phase,
    npcs: npcPool,
    bakeryState: bakeryState,
    shiftActions: shiftResult.actions,
    tension: tensionResult.tensionLevel,
    emergencyLevel: peakActive ? 'CRITICAL' : 'NORMAL',
    npcTypeCount: npcTypeCount,
    simSpeed: scheduler.getSpeed(),
    isPaused: scheduler.getIsPaused()
  });
}, 2000);

// Cloud Logic: High-Performance Simulation Fallback Active

io.on('connection', (socket) => {
  console.log('--- V4 PRO CLIENT CONNECTED:', socket.id);
  socket.emit('initial_sync', { 
    npcs: npcPool, 
    time: scheduler.getTimeString(),
    phase: scheduler.getCurrentPhase(),
    bakeryState: bakeryState
  });


  socket.on('request_ai_action', async () => {
    // [V4 PRO] Hard-Wired AI Physics & Navigation
    Object.keys(npcPool).forEach(id => {
        const npc = npcPool[id];
        
        // --- VERDRAHTUNG: 24-STUNDEN ACTION DIRECTIVES ---
        if (npc.action === 'GATHER') {
            // Demonstranten ziehen sich gezielt um 10:00 Uhr zur Bühne [0, 0, -6] zusammen
            const targetX = (Math.random() - 0.5) * 6;
            const targetZ = -4 + (Math.random() - 0.5) * 6;
            npc.position[0] += (targetX - npc.position[0]) * 0.05;
            npc.position[2] += (targetZ - npc.position[2]) * 0.05;
        } else if (npc.action === 'PROTEST') {
            // Stehenbleiben bei Ultimatum (12:00) und aggressiv hüpfen (Emotionale Physik)
            npc.position[1] = Math.abs(Math.sin(Date.now() / 150)) * 0.3;
        } else if (npc.action === 'RIOT') {
            // Schwarzer Block (18:00) springt erratisch und bewegt sich schnell aufs Zentrum zu
            npc.position[0] += (Math.random() - 0.5) * 0.6;
            npc.position[2] += (Math.random() - 0.5) * 0.6;
        } else if (id.includes('cop_0800_mission')) {
            // VERDRAHTUNG: Spezial-Mission Cop Blue01
            // Patrouilliert exakt im 2m Radius um den Bühnenmittelpunkt [0, 0, -5]
            const t = Date.now() / 2000;
            npc.position[0] = Math.cos(t) * 2;
            npc.position[2] = -5 + Math.sin(t) * 2;
            console.log(`[WIRED-AI] Cop Blue01 MOVING TO: ${npc.position[0].toFixed(2)}, ${npc.position[2].toFixed(2)} [STATE: GUARD_STAGE]`);
        } else if (npc.action === 'PATROL') {
            // Cops gehen systematisch auf festen Kreis-Pfaden Streife
            const t = Date.now() / 4000 + parseInt(id.replace(/\D/g,'') || '0');
            npc.position[0] = Math.cos(t) * 9;
            npc.position[2] = Math.sin(t) * 9;
            if (Math.random() > 0.98) console.log(`[WIRED-AI] Patrol ${id} active...`);
        } else if (npc.action === 'JOG') {
            // Pendler (Rush Hour 07:00) rennen strikt über die X-Achse
            npc.position[0] -= 0.25;
            if (npc.position[0] < -15) delete npcPool[id]; // Verschwinden aus dem Sichtfeld
        } else if (npc.action === 'SHIELD_WALL_ADVANCE') {
            // SEK drückt stetig nach vorne (Verdrängung 21:00)
            npc.position[2] -= 0.05; 
            if (npc.position[2] < -6) npc.position[2] = -6; // Haltelinie
        } else if (peakActive && npc.type !== 'RiotCop') {
            // Panic Flee Modus bei SEK Übergriff
            npc.position[2] += 0.15 + (Math.random() * 0.1); 
            npc.position[0] += (Math.random() - 0.5) * 0.3;
            if (npc.position[2] > 15) delete npcPool[id];
        } else {
            // Basic WANDER (für neutrale Zivilisten)
            npc.position[0] += (Math.random() - 0.5) * 0.1;
            npc.position[2] += (Math.random() - 0.5) * 0.1;
        }

        // Gravitation & Floor Clamping (außer für Protest-Sprünge)
        if (npc.action !== 'PROTEST') {
            npc.position[1] = 0;
        }
    });
    
    io.emit('npc_update', npcPool);
  });

  socket.on('set_sim_speed', (speed: number) => {
    console.log(`[SIM-CONTROL] Speed set to ${speed}x by ${socket.id}`);
    scheduler.setSpeed(speed);
  });

  socket.on('toggle_sim_pause', () => {
    const newState = !scheduler.getIsPaused();
    console.log(`[SIM-CONTROL] Simulation ${newState ? 'PAUSED' : 'RESUMED'} by ${socket.id}`);
    scheduler.setPaused(newState);
  });

  socket.on('set_game_time', (data: { h: number, m: number, s?: number }) => {
    console.log(`[SIM-CONTROL] Manual Time Adjustment to ${data.h}:${data.m}:${data.s || 0} by ${socket.id}`);
    scheduler.setGameTime(data.h, data.m, data.s || 0);
  });

  socket.on('npc_interact', (data: { npcId: string, playerPos: [number, number, number] }) => {
    const npc = npcPool[data.npcId];
    if (npc) {
      const dist = Math.sqrt(
        Math.pow(npc.position[0] - data.playerPos[0], 2) +
        Math.pow(npc.position[2] - data.playerPos[2], 2)
      );

      if (dist < 2.0) {
        socket.emit('interaction_result', { 
          success: true, 
          message: `Dialog mit ${npc.type} (${scheduler.getCurrentPhase().label}): 'Hallo!'`,
          npcInfo: npc
        });
      } else {
        socket.emit('interaction_result', { success: false, message: 'Zu weit entfernt.' });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('--- V4 PRO CLIENT DISCONNECTED');
  });
});

const PORT = 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`V4 Backend running on port ${PORT} [24H SIM ACTIVE]`);
});
