import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, NPCData } from '../store/gameStore';

const NPCComponent: React.FC<{ npc: NPCData }> = ({ npc }) => {
  const torsoRef = useRef<THREE.Mesh>(null!);
  const headRef = useRef<THREE.Mesh>(null!);
  const leftArmRef = useRef<THREE.Mesh>(null!);
  const rightArmRef = useRef<THREE.Mesh>(null!);
  const signRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Basale Atembewegung (Subtle AAA-Micro-Animation)
    if (torsoRef.current) {
      torsoRef.current.scale.y = 1 + Math.sin(t * 2) * 0.02;
    }

    // Aktions-spezifische Animationen
    if (npc.action === 'PROTEST' || npc.action === 'CHANT') {
      // Kopf-Nicken (Chanting / Protest)
      if (headRef.current) {
        headRef.current.rotation.x = Math.sin(t * 8) * 0.2;
      }
      // Arme rhythmisch bewegen
      if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t * 8) * 0.5;
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.cos(t * 8) * 0.5;
    } else if (npc.action === 'RIOT') {
      // Aggressives Zappeln
      if (headRef.current) headRef.current.rotation.y = Math.sin(t * 15) * 0.3;
      if (torsoRef.current) torsoRef.current.position.y = 0.2 + Math.sin(t * 20) * 0.1;
    } else if (npc.action === 'JOG') {
      // Lauf-Animation (Pendler)
      if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t * 10) * 1.5;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(t * 10) * 1.5;
    }

    // Schild-Sway (Verdrahtet mit Demonstranten)
    if (signRef.current) {
      signRef.current.rotation.z = Math.sin(t * 3) * 0.1;
      signRef.current.position.y = 0.6 + Math.sin(t * 5) * 0.05;
    }
  });

  if (npc.type === 'vehicle') {
    return (
      <group position={npc.position}>
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[2.5, 1.8, 5, 50, 50, 50]} />
          <meshStandardMaterial color="#34495e" metalness={0.7} roughness={0.1} />
          {/* Wheels */}
          {[ [1.4, -0.6, 2], [-1.4, -0.6, 2], [1.4, -0.6, -2], [-1.4, -0.6, -2] ].map((pos, i) => (
            <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 0.5, 40, 10]} />
              <meshStandardMaterial color="#000" />
            </mesh>
          ))}
        </mesh>
        <Text position={[0, 2.5, 0]} fontSize={0.3} color="white">{`VEHICLE: ${npc.action}`}</Text>
      </group>
    );
  }

  const isPolice = ['Police', 'official', 'RiotCop'].includes(npc.type);
  const isDemonstrator = npc.type === 'demonstrator';
  const mainColor = isPolice ? (npc.type === 'RiotCop' ? '#0b0b0b' : '#1a237e') : isDemonstrator ? '#b71c1c' : '#2e7d32';

  return (
    <group position={npc.position}>
      <group position={[0, 1.0, 0]}>
        <mesh ref={torsoRef} position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.5, 0.8, 0.3, 120, 120, 120]} />
          <meshStandardMaterial color={mainColor} metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh ref={headRef} position={[0, 0.85, 0]} castShadow>
          <sphereGeometry args={[0.22, 316, 316]} />
          <meshStandardMaterial color={npc.type === 'RiotCop' ? '#1a1a1a' : '#f5cba7'} />
        </mesh>
        <mesh ref={leftArmRef} position={[-0.35, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.6, 100, 100]} />
          <meshStandardMaterial color={isPolice ? '#111' : '#b71c1c'} />
        </mesh>
        <mesh ref={rightArmRef} position={[0.35, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.6, 100, 100]} />
          <meshStandardMaterial color={isPolice ? '#111' : '#b71c1c'} />
        </mesh>
        {npc.type === 'RiotCop' && (
          <mesh position={[0.4, 0, 0.3]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <boxGeometry args={[0.1, 1.0, 0.6, 120, 120, 120]} />
            <meshStandardMaterial color="#000000" transparent opacity={0.6} metalness={0.9} roughness={0.1} />
          </mesh>
        )}
        {['Police', 'official'].includes(npc.type) && (
          <mesh position={[0, 1.05, 0]} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.1, 316, 20]} />
            <meshStandardMaterial color="#1a237e" />
          </mesh>
        )}
        {npc.type === 'demonstrator' && (
          <group ref={signRef} position={[-0.4, 0.6, 0.3]}>
            <mesh position={[0, -0.4, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, 0.8, 120, 120]} /><meshStandardMaterial color="#795548" /></mesh>
            <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[0.05, 0.5, 0.6, 80, 80, 80]} /><meshStandardMaterial color="#ffffff" /></mesh>
          </group>
        )}
      </group>
      <Text position={[0, 2.5, 0]} fontSize={0.3} color="#ffffff" outlineColor="#000000">{`${npc.type.toUpperCase()}: ${npc.action}`}</Text>
    </group>
  );
};

const NPCManager: React.FC = () => {
  const npcs = useGameStore((state) => state.npcs);
  const npcList = Object.values(npcs);
  return (
    <>
      {npcList.map((npc) => <NPCComponent key={npc.id} npc={npc} />)}
    </>
  );
};

export default NPCManager;
