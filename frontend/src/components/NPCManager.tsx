import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

const dummy = new THREE.Object3D();
const color = new THREE.Color();

const NPCManager: React.FC = () => {
  // We NO LONGER subscribe to npcs state here to avoid React re-renders.
  // We will read directly from the non-reactive npcPool in useFrame.
  
  const maxNpcs = 1000;
  const bodyRef = useRef<THREE.InstancedMesh>(null!);
  const headRef = useRef<THREE.InstancedMesh>(null!);

  useFrame((state) => {
    if (!bodyRef.current || !headRef.current) return;
    
    const t = state.clock.getElapsedTime();
    const npcPool = useGameStore.getState().npcPool;
    const ids = Object.keys(npcPool);
    const count = ids.length;

    for (let i = 0; i < count; i++) {
      const npc = npcPool[ids[i]];
      if (!npc) continue;

      // PERFORMANCE GUARD: Skip NPCs far from center/camera to save matrix updates
      const distSq = npc.position[0] * npc.position[0] + npc.position[2] * npc.position[2];
      if (distSq > 80 * 80) { // Culling at 80m radius
        continue;
      }

      // Base Position
      dummy.position.set(npc.position[0], npc.position[1], npc.position[2]);
      
      // Path-Based Heading (Face movement direction)
      if (npc.path && npc.path.length > 0) {
        const nextTarget = npc.path[(npc.pathIndex || 0)];
        if (nextTarget) {
          dummy.lookAt(nextTarget[0], 0.9, nextTarget[2]);
        }
      }

      // Bouncing animation
      const isMoving = npc.action === 'JOGGING' || npc.action === 'PROTEST' || npc.action === 'CHANT' || !!npc.path;
      const bounce = isMoving ? Math.abs(Math.sin(t * 5 + i)) * 0.1 : 0;
      
      // Update Body
      dummy.position.y = 0.9 + bounce;
      dummy.scale.set(1, 1, 1);
      
      if (isMoving) {
        dummy.rotation.z = Math.sin(t * 5 + i) * 0.1;
      }
      
      dummy.updateMatrix();
      bodyRef.current.setMatrixAt(i, dummy.matrix);

      // Update Head
      dummy.position.y = 1.6 + bounce;
      dummy.updateMatrix();
      headRef.current.setMatrixAt(i, dummy.matrix);
      
      // Colors (Only set if we really need to - here for simplicity we keep it but optimization is possible)
      const isPolice = ['Police', 'official', 'RiotCop'].includes(npc.type);
      const isVehicle = npc.type === 'vehicle';
      
      if (isVehicle) {
        color.set('#34495e');
      } else if (isPolice) {
        color.set(npc.type === 'RiotCop' ? '#111111' : '#1a237e');
      } else {
        color.set(npc.type === 'demonstrator' ? '#cc0000' : '#444444');
      }
      bodyRef.current.setColorAt(i, color);
      
      if (isVehicle) {
        color.set('#555555');
      } else if (isPolice) {
        color.set(npc.type === 'RiotCop' ? '#111111' : '#f5cba7');
      } else {
        color.set('#f5cba7');
      }
      headRef.current.setColorAt(i, color);
    }

    bodyRef.current.count = count;
    headRef.current.count = count;

    bodyRef.current.instanceMatrix.needsUpdate = true;
    if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true;
    
    headRef.current.instanceMatrix.needsUpdate = true;
    if (headRef.current.instanceColor) headRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, maxNpcs]} castShadow receiveShadow>
        <capsuleGeometry args={[0.25, 0.6, 200, 200]} /> {/* AAA High-Poly: >200k triangles targeted */}
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      
      <instancedMesh ref={headRef} args={[undefined, undefined, maxNpcs]} castShadow receiveShadow>
        <sphereGeometry args={[0.2, 200, 200]} /> {/* AAA High-Poly: >200k triangles targeted */}
        <meshStandardMaterial roughness={0.4} />
      </instancedMesh>
    </group>
  );
};

export default NPCManager;
