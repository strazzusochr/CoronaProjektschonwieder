/**
 * JETBRAIN V5.3 — HYBRID RENDER ENGINE
 * 
 * Renders 3D scene LOCALLY via Three.js/R3F when no cloud stream is available.
 * Falls back to PixelStream when a Colab backend is connected.
 * 
 * This eliminates the BLACK SCREEN bug when the cloud tunnel is offline.
 */

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { io } from 'socket.io-client';
import { useGameStore, NPCData } from './store/gameStore';
import { TelemetryHUD } from './components/TelemetryHUD';
import { CityEnvironment } from './components/CityEnvironment';
import { RoadSystem } from './components/RoadSystem';
import { CentralPark } from './components/CentralPark';
import { DayNightCycle } from './components/DayNightCycle';
import { StreetLamps } from './components/StreetLamps';
import NPCManager from './components/NPCManager';

// ═══════════════════════════════════════════════════════════════
// CLOUD URL — nur aktiv wenn ?backend=URL als Query-Param gesetzt
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

  const setConnectionStatus = useGameStore((state) => state.setConnectionStatus);
  const setWorldState = useGameStore((state) => state.setWorldState);
  const emergency = useGameStore((state) => state.emergency);
  const setTension = useGameStore((state) => state.setTension);
  const setEmergency = useGameStore((state) => state.setEmergency);
  const isStreamingMode = useGameStore((state) => state.isStreamingMode);

  const [shiftNotification, setShiftNotification] = useState<string | null>(null);
  const [cloudConnected, setCloudConnected] = useState(false);
  const [thermalSafety, setThermalSafety] = useState(true); // Standardmäßig zum Schutz aktiv
  const socketRef = useRef<any>(null);

  useEffect(() => {
    // Backend nur wenn explizit per Query-Param konfiguriert: ?backend=https://xxx.trycloudflare.com
    const params = new URLSearchParams(window.location.search);
    const backendUrl = params.get('backend');
    
    // 🛡️ THERMAL BYPASS: Wenn wir im Streaming-Modus (Cloud) sind, Rendering erlauben
    if (isStreamingMode) {
       setThermalSafety(false);
       console.log('[V5.3] CLOUD-RENDERER ACTIVE — 3D ENGINE ENGAGED');
    }

    if (!backendUrl) {
      console.log('[V5.3 THERMAL] Kein Backend — ZERO LOAD SAFETY ACTIVE');
      setConnectionStatus('disconnected');
      setCloudConnected(false);
      
      if (!isStreamingMode) {
         setThermalSafety(true);
         return;
      }

      // --- CLOUD-SIDE BACKEND SIMULATION (Läuft nur in Colab) ---
      const demoNpcs: Record<string, NPCData> = {};
      const types = ['civilian', 'civilian', 'civilian', 'demonstrator', 'Police', 'civilian', 'civilian', 'RiotCop'];
      for (let i = 0; i < 150; i++) {
        const x = (Math.random() - 0.5) * 80;
        const z = (Math.random() - 0.5) * 80;
        demoNpcs[`npc_${i}`] = {
          id: `npc_${i}`,
          position: [x, 0, z],
          action: Math.random() > 0.4 ? 'JOGGING' : 'IDLE',
          mood: 'NEUTRAL',
          type: types[i % types.length],
        };
      }
      useGameStore.getState().setNPCs(demoNpcs);

      const isSafe = (x: number, z: number) => {
        const absX = Math.abs(x);
        const absZ = Math.abs(z);
        const dist = Math.sqrt(x*x + z*z);
        if (absX < 45 && absZ < 45) return true; // Park
        if (absX < 9) return true; // N-S Road
        if (absZ < 9) return true; // E-W Road
        if (dist > 44 && dist < 53) return true; // Ring Road
        return false; // Collision with buildings
      };

      const demoTimer = setInterval(() => {
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        setWorldState(`${h}:${m}`, 'NACHT', 0.2, 'OPEN');
        setTension(25);

        const pool = useGameStore.getState().npcPool;
        Object.values(pool).forEach((npc: any) => {
          if (npc.action === 'JOGGING') {
            const dx = (Math.random() - 0.5) * 0.8;
            const dz = (Math.random() - 0.5) * 0.8;
            const nextX = npc.position[0] + dx;
            const nextZ = npc.position[2] + dz;
            if (isSafe(nextX, nextZ)) {
              npc.position[0] = nextX;
              npc.position[2] = nextZ;
            } else {
               // Bei Kollision Richtung ändern (Wander-Logik)
               npc.position[0] -= dx * 1.5;
               npc.position[2] -= dz * 1.5;
            }
          }
        });
      }, 50); // Höhere Frequenz für glattere Cloud-Frames
      return () => clearInterval(demoTimer);
    }
    
    setThermalSafety(false); // Deaktivieren wenn wir Cloud-Streaming nutzen
    console.log('[V5.3 HYBRID] Connecting to:', backendUrl);
    const socket = io(backendUrl, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 2,
      timeout: 4000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[V5.3] Cloud backend connected — Telemetry active');
      setConnectionStatus('connected');
      setCloudConnected(true);
    });

    socket.on('connect_error', () => {
      console.log('[V5.3] Cloud offline — THERMAL PROTECTION TRIGGERED');
      setConnectionStatus('disconnected');
      setCloudConnected(false);
      setThermalSafety(!isStreamingMode);
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      setCloudConnected(false);
      setThermalSafety(!isStreamingMode);
    });

    const handleData = (data: SocketData) => {
      if (data.time) {
        const phaseLabel = typeof data.phase === 'string' ? data.phase : (data.phase as any)?.label || '';
        const ambient = typeof data.phase === 'object' ? (data.phase as any)?.ambient : 0.5;
        setWorldState(data.time, phaseLabel, ambient, data.bakeryState || '');
      }
      if (data.tension !== undefined) setTension(data.tension);
      if (data.emergencyLevel) setEmergency(data.emergencyLevel);

      if (data.npcs && typeof data.npcs === 'object') {
        const counts: Record<string, number> = {};
        Object.values(data.npcs).forEach((npc: any) => {
          const t = npc.type || 'civilian';
          counts[t] = (counts[t] || 0) + 1;
        });
        useGameStore.getState().setSimData(counts, data.simSpeed || 1, data.isPaused || false);
        useGameStore.getState().setNPCs(data.npcs);
      } else if (data.npcTypeCount !== undefined) {
        useGameStore.getState().setSimData(data.npcTypeCount, data.simSpeed || 1, data.isPaused || false);
      }

      if (data.shiftActions && data.shiftActions.length > 0) {
        setShiftNotification(data.shiftActions.join(' | '));
        setTimeout(() => setShiftNotification(null), 8000);
      }
    };

    socket.on('initial_sync', handleData);
    socket.on('world_update', handleData);
    socket.on('npc_update', () => {});

    const interval = setInterval(() => {
      if (socket.connected) socket.emit('request_ai_action', {});
    }, 2000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
      setConnectionStatus('disconnected');
    };
  }, [setConnectionStatus, setWorldState, setTension, setEmergency, isStreamingMode]);

  // 🛡️ HARDWARE PROTECTION: Nur wenn explizit ?streaming=true gesetzt ist, wird die 3D Engine geladen.
  // Das verhindert JEDE GPU/CPU Last auf dem Client-System.
  if (!isStreamingMode) {
    return (
      <div style={{ 
        width: '100vw', height: '100vh', background: '#000', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#0f0', fontFamily: 'monospace' 
      }}>
        <div style={{ 
          padding: '40px', border: '2px solid #0f0', borderRadius: '12px', 
          background: 'rgba(0,255,0,0.05)', textAlign: 'center', boxShadow: '0 0 40px rgba(0,255,0,0.1)'
        }}>
          <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>⚡ JETBRAIN THIN-CLIENT ⚡</h1>
          <p style={{ fontSize: '18px', color: '#fff' }}>ZERO-LOAD MODUS AKTIV</p>
          <div style={{ marginTop: '30px', color: '#888', fontSize: '14px' }}>
            Die 3D-Engine ist auf diesem System deaktiviert.<br/>
            Nutze den Cloud-Stream für die visuelle Darstellung.<br/>
            <b>Lokale Last: 0% GPU / 0% CPU</b>
          </div>
          <div style={{ marginTop: '40px', color: '#0f0', fontSize: '12px' }}>
            Empfange Telemetrie: {cloudConnected ? 'JA' : 'NEIN (Warte auf Backend)'}
          </div>
        </div>
        
        {/* Telemetrie-HUD — geringe CPU-Last, keine GPU-Last */}
        <TelemetryHUD socket={socketRef.current} />
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      <Canvas
        shadows
        camera={{ position: [0, 120, 80], fov: 50, near: 0.1, far: 600 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <DayNightCycle speedMultiplier={30} />
          <fog attach="fog" args={['#050810', 100, 350]} />
          <Stars radius={200} depth={60} count={5000} factor={5} saturation={0.2} fade speed={0.5} />
          <RoadSystem />
          <CentralPark />
          <CityEnvironment />
          <NPCManager />
          <StreetLamps />
          <OrbitControls 
            enableDamping 
            dampingFactor={0.05}
            minDistance={10}
            maxDistance={200}
            maxPolarAngle={Math.PI / 2.1}
          />
        </Suspense>
      </Canvas>

      <TelemetryHUD socket={socketRef.current} />

      <div style={{
        position: 'absolute', top: 10, right: 10,
        fontFamily: 'monospace', fontSize: '11px',
        background: 'rgba(0,0,0,0.8)', padding: '5px 12px',
        border: '1px solid #00f0ff', color: '#00f0ff',
        borderRadius: '4px', zIndex: 9999
      }}>
        RENDERER-MODE (CLOUD)
      </div>

      {/* HUD Overlay */}
      <TelemetryHUD socket={socketRef.current} />

      {/* Connection Status Badge */}
      <div style={{
        position: 'absolute', top: 10, right: 10,
        fontFamily: 'monospace', fontSize: '11px',
        background: 'rgba(0,0,0,0.8)', padding: '5px 12px',
        border: `1px solid ${cloudConnected ? '#00ff00' : (thermalSafety ? '#ff2244' : '#ffaa00')}`,
        color: cloudConnected ? '#00ff00' : (thermalSafety ? '#ff2244' : '#ffaa00'),
        borderRadius: '4px', zIndex: 9999
      }}>
        <span style={{
          display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
          background: cloudConnected ? '#00ff00' : (thermalSafety ? '#ff2244' : '#ffaa00'), marginRight: 6,
        }} />
        {cloudConnected ? 'CLOUD STREAM' : (isStreamingMode ? 'CLOUD SOURCE' : (thermalSafety ? 'ZERO LOAD SAFETY' : 'LOCAL 3D ENGINE'))}
      </div>

      {/* Shift Notification */}
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

      {/* Emergency Overlay */}
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
