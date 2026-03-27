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

  const [shiftNotification, setShiftNotification] = useState<string | null>(null);
  const [cloudConnected, setCloudConnected] = useState(false);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    // Backend nur wenn explizit per Query-Param konfiguriert: ?backend=https://xxx.trycloudflare.com
    const params = new URLSearchParams(window.location.search);
    const backendUrl = params.get('backend');
    
    if (!backendUrl) {
      console.log('[V5.3 HYBRID] Kein Backend — LOCAL 3D ENGINE AKTIV');
      setConnectionStatus('disconnected');
      setCloudConnected(false);

      // 200 Demo-NPCs lokal generieren
      const demoNpcs: Record<string, NPCData> = {};
      const types = ['civilian', 'civilian', 'civilian', 'demonstrator', 'Police', 'civilian', 'civilian', 'RiotCop'];
      for (let i = 0; i < 200; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 30 + Math.random() * 80; // Start outside pond
        demoNpcs[`npc_${i}`] = {
          id: `npc_${i}`,
          position: [
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
          ],
          action: Math.random() > 0.5 ? 'JOGGING' : 'IDLE',
          mood: 'NEUTRAL',
          type: types[i % types.length],
        };
      }
      useGameStore.getState().setNPCs(demoNpcs);
      const counts: Record<string, number> = {};
      Object.values(demoNpcs).forEach(n => {
        counts[n.type] = (counts[n.type] || 0) + 1;
      });
      useGameStore.getState().setSimData(counts, 1, false);

      // Echtzeit-Uhr + Phasen
      const demoTimer = setInterval(() => {
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        const hour = now.getHours();
        let phase = 'NACHT';
        if (hour >= 5 && hour < 7) phase = 'SONNENAUFGANG';
        else if (hour >= 7 && hour < 12) phase = 'MORGEN';
        else if (hour >= 12 && hour < 14) phase = 'MITTAG';
        else if (hour >= 14 && hour < 18) phase = 'NACHMITTAG';
        else if (hour >= 18 && hour < 20) phase = 'SONNENUNTERGANG';
        setWorldState(`${h}:${m}`, phase, hour >= 7 && hour < 18 ? 0.8 : 0.2, 'OPEN');
        setTension(Math.floor(Math.random() * 30) + 15);

        // NPC Positionen animieren
        const pool = useGameStore.getState().npcPool;
        Object.values(pool).forEach((npc: any) => {
          if (npc.action === 'JOGGING') {
            npc.position[0] += (Math.random() - 0.5) * 0.3;
            npc.position[2] += (Math.random() - 0.5) * 0.3;
          }
        });
      }, 1000);
      return () => clearInterval(demoTimer);
    }
    
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
      console.log('[V5.3] Cloud offline — LOCAL 3D RENDERING ACTIVE');
      setConnectionStatus('disconnected');
      setCloudConnected(false);
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      setCloudConnected(false);
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
  }, [setConnectionStatus, setWorldState, setTension, setEmergency]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      {/* ═══ LOCAL 3D RENDERING (Three.js/R3F) ═══ */}
      <Canvas
        shadows
        camera={{ position: [0, 120, 80], fov: 50, near: 0.1, far: 600 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          {/* === Tag/Nacht-Zyklus (ersetzt statische Lichter) === */}
          <DayNightCycle
            speedMultiplier={30}
            onPhaseChange={(phase, hour) => {
              console.log(`[PHASE] ${phase} (${hour}:00)`);
            }}
          />
          
          {/* Fog */}
          <fog attach="fog" args={['#050810', 100, 350]} />
          
          {/* Starfield */}
          <Stars radius={200} depth={60} count={5000} factor={5} saturation={0.2} fade speed={0.5} />
          
          {/* 3D Scene (1:1 Reconstruction) */}
          <RoadSystem />
          <CentralPark />
          <CityEnvironment />
          <NPCManager />
          <StreetLamps />
          
          {/* Camera Controls */}
          <OrbitControls 
            enableDamping 
            dampingFactor={0.05}
            minDistance={10}
            maxDistance={200}
            maxPolarAngle={Math.PI / 2.1}
          />
        </Suspense>
      </Canvas>

      {/* HUD Overlay */}
      <TelemetryHUD socket={socketRef.current} />

      {/* Connection Status Badge */}
      <div style={{
        position: 'absolute', top: 10, right: 10,
        fontFamily: 'monospace', fontSize: '11px',
        background: 'rgba(0,0,0,0.8)', padding: '5px 12px',
        border: `1px solid ${cloudConnected ? '#00ff00' : '#ffaa00'}`,
        color: cloudConnected ? '#00ff00' : '#ffaa00',
        borderRadius: '4px', zIndex: 9999
      }}>
        <span style={{
          display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
          background: cloudConnected ? '#00ff00' : '#ffaa00', marginRight: 6,
        }} />
        {cloudConnected ? 'CLOUD STREAM' : 'LOCAL 3D ENGINE'}
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
