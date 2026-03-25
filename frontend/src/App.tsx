/**
 * JETBRAIN V4 — ZERO-LOAD THIN CLIENT
 * 
 * CRITICAL: This file contains ZERO 3D rendering code.
 * All Three.js, React Three Fiber, WebGL, and WebGPU imports have been
 * PHYSICALLY REMOVED to guarantee 0% CPU/GPU load on the home PC.
 * 
 * The 3D scene is rendered on a CLOUD SERVER (Oracle/AWS/Vagon)
 * and streamed as MJPEG video to this thin client.
 * 
 * This client only does:
 * 1. Display the MJPEG video stream (PixelStream component)
 * 2. Display the HUD overlay (TelemetryHUD component)
 * 3. Receive lightweight telemetry data via Socket.IO
 */

import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useGameStore, NPCData } from './store/gameStore';
import { TelemetryHUD } from './components/TelemetryHUD';
import PixelStream from './components/PixelStream';

// ═══════════════════════════════════════════════════════════════
// NO Three.js imports. NO Canvas. NO WebGL. NO GPU usage. ZERO.
// ═══════════════════════════════════════════════════════════════

interface SocketData {
  time: string;
  phase: { label: string; period: string; ambient: number };
  npcs: Record<string, NPCData>;
  bakeryState: string;
  shiftActions?: string[];
  tension?: number;
  emergencyLevel?: string;
  npcTypeCount?: Record<string, number>;
  simSpeed?: number;
  isPaused?: boolean;
}

const App: React.FC = () => {
  const setNPCs = useGameStore((state) => state.setNPCs);
  const updateNPCs = useGameStore((state) => state.updateNPCs);
  const setConnectionStatus = useGameStore((state) => state.setConnectionStatus);
  const setWorldState = useGameStore((state) => state.setWorldState);
  const emergency = useGameStore((state) => state.emergency);
  const setTension = useGameStore((state) => state.setTension);
  const setEmergency = useGameStore((state) => state.setEmergency);

  const [shiftNotification, setShiftNotification] = useState<string | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const backendUrl = window.location.origin.includes('localhost')
      ? 'http://localhost:3001'
      : window.location.origin.replace('5173', '3001');
    const socket = io(backendUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[V4 THIN CLIENT] Connected to simulation backend (0% GPU)');
      setConnectionStatus('connected');
    });

    // Lightweight telemetry only — NO heavy NPC position data processing
    socket.on('initial_sync', (data: SocketData) => {
      if (data.time && data.phase) {
        setWorldState(data.time, data.phase.label, data.phase.ambient, data.bakeryState);
      }
      // Only store NPC count metadata, never full position arrays
      if (data.npcTypeCount !== undefined) {
        useGameStore.getState().setSimData(data.npcTypeCount, data.simSpeed || 1, data.isPaused || false);
      }
    });

    socket.on('world_update', (data: SocketData) => {
      if (data.time && data.phase) {
        setWorldState(data.time, data.phase.label, data.phase.ambient, data.bakeryState);
      }
      if (data.tension !== undefined) setTension(data.tension);
      if (data.emergencyLevel) setEmergency(data.emergencyLevel);
      if (data.npcTypeCount !== undefined) {
        useGameStore.getState().setSimData(data.npcTypeCount, data.simSpeed || 1, data.isPaused || false);
      }

      if (data.shiftActions && data.shiftActions.length > 0) {
        setShiftNotification(data.shiftActions.join(' | '));
        setTimeout(() => setShiftNotification(null), 8000);
      }
    });

    // NPC position updates are IGNORED on the thin client.
    // The cloud renderer handles all NPC rendering.
    socket.on('npc_update', () => {
      // INTENTIONALLY EMPTY — Zero CPU processing
    });

    const interval = setInterval(() => {
      if (socket.connected) socket.emit('request_ai_action', {});
    }, 2000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
      setConnectionStatus('disconnected');
    };
  }, [setConnectionStatus, setWorldState, setTension, setEmergency]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      {/* ONLY PixelStream — NO Canvas, NO WebGL, NO 3D */}
      <PixelStream />

      {/* Lightweight HUD overlay */}
      <TelemetryHUD socket={socketRef.current} />

      {/* Shift notification overlay */}
      {shiftNotification && (
        <div style={{
          position: 'absolute', top: '120px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255, 34, 68, 0.15)', border: '2px solid #ff2244',
          boxShadow: '0 0 20px rgba(255,34,68,0.5)', padding: '15px 30px',
          borderRadius: '4px', color: '#fff', fontFamily: 'Orbitron, sans-serif',
          fontSize: '18px', letterSpacing: '3px', zIndex: 2000
        }}>
          ⚠️ POLIZEI-FUNK: {shiftNotification}
        </div>
      )}

      {/* Emergency overlay */}
      {emergency === 'CRITICAL' && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', color: '#ff2244',
          fontFamily: 'Orbitron, sans-serif', fontWeight: 'bold',
          fontSize: '48px', textShadow: '0 0 40px #ff2244, 0 0 20px #ff0000',
          textAlign: 'center', pointerEvents: 'none', zIndex: 3000
        }}>
          🚨 PEAK EVENT 🚨<br/>
          <span style={{ fontSize: '24px', letterSpacing: '8px', color: '#fff' }}>
            SEC DEPLOYED
          </span>
        </div>
      )}
    </div>
  );
};

export default App;
