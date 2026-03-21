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
  const leftLegRef = useRef<THREE.Mesh>(null!);
  const rightLegRef = useRef<THREE.Mesh>(null!);
  const signRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const speed = npc.action === 'JOG' ? 10 : 2;
    
    // AAA-Micro-Animations: Atmen & Pulsieren
    if (torsoRef.current) torsoRef.current.scale.y = 1 + Math.sin(t * 1.5) * 0.015;

    // Movement-dependent animations
    if (npc.action === 'JOG' || npc.action === 'PROTEST' || npc.action === 'CHANT') {
      const walkFactor = Math.sin(t * speed);
      if (leftArmRef.current) leftArmRef.current.rotation.x = walkFactor * 0.8;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -walkFactor * 0.8;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -walkFactor * 0.5;
      if (rightLegRef.current) rightLegRef.current.rotation.x = walkFactor * 0.5;
      
      if (headRef.current) headRef.current.rotation.x = Math.abs(walkFactor) * 0.1;
    }

    if (signRef.current) {
      signRef.current.rotation.z = Math.sin(t * 3) * 0.05;
      signRef.current.position.y = 0.6 + Math.sin(t * 5) * 0.03;
    }
  });

  if (npc.type === 'vehicle') {
    return (
      <group position={npc.position}>
        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[2.5, 1.8, 5, 200, 200, 200]} />
          <meshPhysicalMaterial color="#34495e" metalness={0.9} roughness={0.1} clearcoat={1} />
          {/* High-Poly Wheels */}
          {[ [1.4, -0.6, 2], [-1.4, -0.6, 2], [1.4, -0.6, -2], [-1.4, -0.6, -2] ].map((pos, i) => (
            <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.45, 0.45, 0.6, 120, 20]} />
              <meshStandardMaterial color="#111" roughness={0.9} />
            </mesh>
          ))}
        </mesh>
        <Text position={[0, 3, 0]} fontSize={0.4} color="white">{`VEHICLE: ${npc.action}`}</Text>
      </group>
    );
  }

  const isPolice = ['Police', 'official', 'RiotCop'].includes(npc.type);
  const mainColor = isPolice ? (npc.type === 'RiotCop' ? '#111' : '#1a237e') : npc.type === 'demonstrator' ? '#cc0000' : '#444';

  return (
    <group position={npc.position}>
      <group position={[0, 0.9, 0]}> {/* Pivot at character bottom */}
        {/* Torso - Organic Shape */}
        <mesh ref={torsoRef} position={[0, 0.6, 0]} castShadow>
          <capsuleGeometry args={[0.25, 0.5, 32, 120]} />
          <meshStandardMaterial color={mainColor} roughness={0.3} />
        </mesh>
        
        {/* Head - 64k+ Poly Sphere */}
        <mesh ref={headRef} position={[0, 1.3, 0]} castShadow>
          <sphereGeometry args={[0.2, 316, 316]} />
          <meshStandardMaterial 
            color={npc.type === 'RiotCop' ? '#111' : '#f5cba7'} 
            metalness={npc.type === 'RiotCop' ? 0.9 : 0} 
            roughness={npc.type === 'RiotCop' ? 0.1 : 0.8}
          />
          {/* Riot Helmet Visor - Glow-Effect */}
          {npc.type === 'RiotCop' && (
            <mesh position={[0, 0, 0.11]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.32, 0.18, 0.05, 80, 80, 80]} />
              <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={2.0} transparent opacity={0.6} />
            </mesh>
          )}
        </mesh>

        {/* Arms */}
        <mesh ref={leftArmRef} position={[-0.35, 0.8, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.45, 32, 100]} />
          <meshStandardMaterial color={mainColor} roughness={0.2} metalness={isPolice ? 0.5 : 0} />
        </mesh>
        <mesh ref={rightArmRef} position={[0.35, 0.8, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.45, 32, 100]} />
          <meshStandardMaterial color={mainColor} roughness={0.2} metalness={isPolice ? 0.5 : 0} />
        </mesh>

        {/* Legs */}
        <mesh ref={leftLegRef} position={[-0.15, 0.25, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.55, 32, 100]} />
          <meshStandardMaterial color={isPolice ? '#050505' : '#222'} roughness={0.1} />
        </mesh>
        <mesh ref={rightLegRef} position={[0.15, 0.25, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.55, 32, 100]} />
          <meshStandardMaterial color={isPolice ? '#050505' : '#222'} roughness={0.1} />
        </mesh>

        {/* Tactical Shield (RiotCop) */}
        {npc.type === 'RiotCop' && (
          <group position={[0.45, 0.6, 0.2]} rotation={[0, -0.2, 0]}>
             <mesh castShadow>
               <boxGeometry args={[0.1, 1.2, 0.7, 120, 120, 120]} />
               <meshPhysicalMaterial color="#000" transparent opacity={0.5} roughness={0} metalness={1} transmission={0.9} />
             </mesh>
          </group>
        )}

        {/* Protest Sign */}
        {npc.type === 'demonstrator' && (
          <group ref={signRef} position={[-0.4, 1.1, 0.3]}>
            <mesh position={[0, -0.4, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, 1.0, 120, 120]} /><meshStandardMaterial color="#5D4037" /></mesh>
            <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[0.02, 0.6, 0.8, 80, 80, 80]} /><meshStandardMaterial color="#fff" /></mesh>
          </group>
        )}
      </group>
      <Text position={[0, 2.8, 0]} fontSize={0.25} color="white" outlineColor="black" outlineWidth={0.02}>{`${npc.type}: ${npc.action}`}</Text>
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
