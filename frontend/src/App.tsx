import React, { Suspense, useEffect, useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera, Text } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { io } from 'socket.io-client';
import { useGameStore, NPCData } from './store/gameStore';
import NPCManager from './components/NPCManager';
import { GoreEffects } from './components/GoreEffects';
import { AudioManager } from './systems/AudioManager';

interface SocketData {
  time: string;
  phase: { label: string; period: string; ambient: number };
  npcs: Record<string, NPCData>;
  bakeryState: string;
  shiftActions?: string[];
  tension?: number;
  emergencyLevel?: string;
}

// Hyper-AAA Custom Shader Material (GLSL)
const GridShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00d4ff) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;
    void main() {
      float strength = step(0.98, mod(vUv.x * 20.0 + uTime * 0.1, 1.0));
      strength += step(0.98, mod(vUv.y * 20.0, 1.0));
      vec3 color = mix(vec3(0.005, 0.01, 0.02), uColor, strength * 0.5);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

function AnimatedGrid() {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[100, 100, 316, 316]} />
      <shaderMaterial attach="material" {...GridShaderMaterial} />
    </mesh>
  );
}

function Bakery() {
  const bakeryState = useGameStore((state) => state.bakeryState);
  return (
    <group position={[52.8, 0, 34.5]}>
      <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 5, 8, 130, 130, 130]} />
        <meshStandardMaterial color="#2c3e50" metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0, 2, 4.1]} receiveShadow>
        <planeGeometry args={[8, 3, 316, 316]} />
        <meshStandardMaterial color="#88ccff" transparent opacity={0.3} emissive={bakeryState !== 'CLOSED' ? '#ffaa00' : '#000'} emissiveIntensity={bakeryState !== 'CLOSED' ? 1 : 0} />
      </mesh>
      <pointLight position={[0, 3, 0]} intensity={bakeryState !== 'CLOSED' ? 2 : 0} color="#ffcc88" />
      <mesh position={[4, 1.5, 4.1]} rotation={[0, bakeryState === 'DOOR_OPEN' || bakeryState === 'OPEN' ? -Math.PI / 2 : 0, 0]} castShadow>
        <boxGeometry args={[1, 3, 0.1, 80, 80, 80]} />
        <meshStandardMaterial color="#34495e" />
      </mesh>
    </group>
  );
}

function DemoStage() {
  const worldTime = useGameStore((state) => state.worldTime);
  const currentHour = parseInt(worldTime.split(':')[0], 10) || 0;
  if (currentHour < 8) return null;
  return (
    <group position={[0, 0, -15]}>
      {/* Massive Main Platform - 200k Polys */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[20, 1.0, 8, 200, 100, 100]} />
        <meshStandardMaterial color="#212121" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Scaffolding / Truss Structure (Left & Right) */}
      <group position={[-9, 5, 0]}>
        <mesh castShadow><boxGeometry args={[0.5, 10, 0.5, 40, 200, 40]} /><meshStandardMaterial color="#555" metalness={1} /></mesh>
      </group>
      <group position={[9, 5, 0]}>
        <mesh castShadow><boxGeometry args={[0.5, 10, 0.5, 40, 200, 40]} /><meshStandardMaterial color="#555" metalness={1} /></mesh>
      </group>

      {/* Speaker Arrays - Massive Stack 6x10m */}
      <group position={[-7.5, 3.5, 1]}>
         <mesh castShadow><boxGeometry args={[2, 6, 1.5, 100, 200, 100]} /><meshStandardMaterial color="#050505" /></mesh>
      </group>
      <group position={[7.5, 3.5, 1]}>
         <mesh castShadow><boxGeometry args={[2, 6, 1.5, 100, 200, 100]} /><meshStandardMaterial color="#050505" /></mesh>
      </group>

      {/* Giant LED Backdrop - 100k Poly Surface */}
      <mesh position={[0, 5, -3.8]} receiveShadow>
        <planeGeometry args={[18, 9, 316, 200]} />
        <meshStandardMaterial 
          color="#ff0000" 
          emissive="#ff0000" 
          emissiveIntensity={currentHour >= 11 ? 2.5 : 0.5} 
        />
        <Text position={[0, 0, 0.1]} fontSize={1.2} color="white" fontStyle="italic">DEMO 2026: FREIHEIT</Text>
      </mesh>
    </group>
  );
}

// Zentraler Scene-Renderer für Audio & Post-Processing
const Scene: React.FC = () => {
  const { camera } = useThree();
  const emergency = useGameStore(s => s.emergency);
  const tension = useGameStore(s => s.tension);
  const worldAmbient = useGameStore(s => s.worldAmbient);
  const audioInitialized = useRef(false);

  useEffect(() => {
    if (!audioInitialized.current) {
        const manager = new AudioManager(camera);
        manager.createOscillatorSound('bakery_hum', camera, 120);
        manager.setVolume('bakery_hum', 0.2);
        manager.createOscillatorSound('demo_chant', camera, 440);
        manager.setVolume('demo_chant', 0.1);
        audioInitialized.current = true;
    }
  }, [camera]);

  return (
    <>
      <color attach="background" args={emergency === 'CRITICAL' ? ['#200000'] : ['#000308']} />
      <fog attach="fog" args={[tension > 80 ? '#200' : tension > 50 ? '#111' : '#000308', 5, tension > 80 ? 25 : 50]} />
      
      <ambientLight intensity={tension > 80 ? 1.5 : worldAmbient} color={tension > 50 ? "#ff5555" : "#ffffff"} />
      <pointLight position={[-5, 5, -5]} intensity={tension > 80 ? 3 : 1.5} color={tension > 50 ? "#ff0000" : "#00d4ff"} />
      <directionalLight position={[10, 10, 5]} intensity={2} castShadow shadow-mapSize={[1024, 1024]} />

      <Suspense fallback={null}>
        <GoreEffects />
        <NPCManager />
        <Bakery />
        <DemoStage />
        <AnimatedGrid />
        <mesh position={[0, 1.5, 0]} castShadow><sphereGeometry args={[1, 316, 316]} /><meshStandardMaterial color="#fff" metalness={0.9} roughness={0.1} /></mesh>
      </Suspense>

      <Environment preset="night" />
      <ContactShadows opacity={0.4} scale={15} blur={2.5} far={5} />

      {/* AAA Post-Processing Layer */}
      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={1} mipmapBlur intensity={tension / 50} />
        <ChromaticAberration offset={new THREE.Vector2(tension / 1000, tension / 1000)} />
        <Vignette eskil={false} offset={0.1} darkness={tension / 150} />
      </EffectComposer>
    </>
  );
};

const App: React.FC = () => {
  const setNPCs = useGameStore((state) => state.setNPCs);
  const updateNPCs = useGameStore((state) => state.updateNPCs);
  const setConnectionStatus = useGameStore((state) => state.setConnectionStatus);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const setWorldState = useGameStore((state) => state.setWorldState);
  const worldTime = useGameStore((state) => state.worldTime);
  const worldPhase = useGameStore((state) => state.worldPhase);
  const tension = useGameStore((state) => state.tension);
  const emergency = useGameStore((state) => state.emergency);
  const setTension = useGameStore((state) => state.setTension);
  const setEmergency = useGameStore((state) => state.setEmergency);

  const [shiftNotification, setShiftNotification] = useState<string | null>(null);

  useEffect(() => {
    const backendUrl = window.location.origin.includes('localhost') ? 'http://localhost:3001' : window.location.origin.replace('5173', '3001');
    const socket = io(backendUrl);

    socket.on('connect', () => {
      setConnectionStatus('connected');
    });

    socket.on('npc_update', (data) => {
      updateNPCs(data);
    });

    socket.on('initial_sync', (data: SocketData) => {
      setNPCs(data.npcs);
      if (data.time) setWorldState(data.time, data.phase.label, data.phase.ambient, data.bakeryState);
    });

    socket.on('world_update', (data: SocketData) => {
      setNPCs(data.npcs);
      setWorldState(data.time, data.phase.label, data.phase.ambient, data.bakeryState);
      if (data.tension !== undefined) setTension(data.tension);
      if (data.emergencyLevel) setEmergency(data.emergencyLevel);
      
      if (data.shiftActions && data.shiftActions.length > 0) {
          setShiftNotification(data.shiftActions.join(' | '));
          setTimeout(() => setShiftNotification(null), 8000);
      }
    });

    const interval = setInterval(() => {
      if (socket.connected) socket.emit('request_ai_action', {});
    }, 2000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
      setConnectionStatus('disconnected');
    };
  }, [setNPCs, updateNPCs, setConnectionStatus, setWorldState, setTension, setEmergency]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas shadows gl={{ antialias: true, alpha: false, stencil: false }}>
        <PerspectiveCamera makeDefault position={[12, 8, 12]} fov={50} />
        <Scene />
        <OrbitControls makeDefault />
      </Canvas>
      
      <div style={{ position: 'absolute', top: 30, left: 30, zIndex: 1000, color: '#00d4ff', background: 'rgba(0, 5, 15, 0.8)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(0, 212, 255, 0.3)', fontFamily: "'Inter', sans-serif", letterSpacing: '2px', textShadow: '0 0 10px rgba(0, 212, 255, 0.5)' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>JETBRAIN V4.0 [NPC SIM]</h1>
        <p style={{ margin: '10px 0', opacity: 0.8, fontSize: '14px', color: '#fff' }}>ZEIT: {worldTime} — {worldPhase.toUpperCase()}</p>
        <p style={{ margin: '5px 0', opacity: 0.7, fontSize: '10px', color: '#00d4ff' }}>BÄCKEREI: {useGameStore.getState().bakeryState}</p>
        <p style={{ margin: '5px 0', opacity: 0.6, fontSize: '10px' }}>STATUS: {connectionStatus.toUpperCase()}</p>
        <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
            <span style={{ color: tension >= 80 ? '#ff2244' : '#ff9800', fontWeight: 'bold' }}>CHAOS FACTOR</span>
            <span style={{ color: tension >= 80 ? '#ff2244' : '#fff' }}>{tension}%</span>
          </div>
          <div style={{ width: '200px', height: '6px', background: 'rgba(255, 152, 0, 0.1)', overflow: 'hidden', borderRadius: '3px' }}>
            <div style={{ width: `${tension}%`, height: '100%', background: tension >= 80 ? '#ff2244' : tension >= 50 ? '#ff9800' : '#4caf50', boxShadow: `0 0 10px ${tension >= 80 ? '#ff2244' : tension >= 50 ? '#ff9800' : '#4caf50'}`, transition: 'width 0.5s ease, background 0.5s ease' }} />
          </div>
        </div>
      </div>
      {shiftNotification && <div style={{ position: 'absolute', top: '120px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255, 34, 68, 0.15)', border: '2px solid #ff2244', boxShadow: '0 0 20px rgba(255,34,68,0.5)', padding: '15px 30px', borderRadius: '4px', color: '#fff', fontFamily: 'Orbitron, sans-serif', fontSize: '18px', letterSpacing: '3px', zIndex: 2000 }}>⚠️ POLIZEI-FUNK: {shiftNotification}</div>}
      {emergency === 'CRITICAL' && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#ff2244', fontFamily: 'Orbitron, sans-serif', fontWeight: 'bold', fontSize: '48px', textShadow: '0 0 40px #ff2244, 0 0 20px #ff0000', textAlign: 'center', pointerEvents: 'none', zIndex: 3000 }}>🚨 PEAK EVENT 🚨<br/><span style={{fontSize: '24px', letterSpacing: '8px', color: '#fff'}}>SEC DEPLOYED</span></div>}
    </div>
  );
};

export default App;
