/**
 * CentralPark — Zentraler Stadtpark mit leuchtendem Teich
 * 
 * Layout wie im Referenzbild:
 * - Ovaler leuchtend-cyan Teich im Zentrum
 * - Sattgrüner Rasen
 * - Dichte Baumbepflanzung um den Teich
 * - Geschwungene Wege
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const dummy = new THREE.Object3D();

export const CentralPark: React.FC = () => {
  const parkSize = 90;
  const pondRadius = 18;
  const treeCount = 200;

  const treeTrunkRef = useRef<THREE.InstancedMesh>(null!);
  const treeLeavesRef = useRef<THREE.InstancedMesh>(null!);
  const waterRef = useRef<THREE.Mesh>(null!);

  // Park Bäume Platzierung — dicht um den Teich
  useMemo(() => {
    setTimeout(() => {
      if (!treeTrunkRef.current || !treeLeavesRef.current) return;

      for (let i = 0; i < treeCount; i++) {
        let x: number, z: number, dist: number;
        do {
          x = (Math.random() - 0.5) * parkSize * 0.85;
          z = (Math.random() - 0.5) * parkSize * 0.85;
          dist = Math.sqrt(x * x + z * z);
        } while (dist < pondRadius + 3 || dist > parkSize * 0.42);

        const scale = 0.8 + Math.random() * 0.6;
        const treeHeight = 2 + Math.random() * 1.5;

        // Trunk
        dummy.position.set(x, treeHeight / 2, z);
        dummy.scale.set(scale * 0.3, treeHeight, scale * 0.3);
        dummy.updateMatrix();
        treeTrunkRef.current.setMatrixAt(i, dummy.matrix);

        // Leaves (grüne Krone — größer und voluminöser)
        dummy.position.set(x, treeHeight + scale * 0.8, z);
        dummy.scale.set(scale * 2.2, scale * 1.8, scale * 2.2);
        dummy.updateMatrix();
        treeLeavesRef.current.setMatrixAt(i, dummy.matrix);
      }
      treeTrunkRef.current.instanceMatrix.needsUpdate = true;
      treeLeavesRef.current.instanceMatrix.needsUpdate = true;
    }, 100);
  }, []);

  // Wasseranimation — pulsierendes Cyan-Glühen
  useFrame((state) => {
    if (waterRef.current) {
      const t = state.clock.getElapsedTime();
      const mat = waterRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.0 + Math.sin(t * 0.8) * 0.5;
    }
  });

  return (
    <group>
      {/* Park Ground — Sattgrüner Rasen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <planeGeometry args={[parkSize, parkSize]} />
        <meshStandardMaterial color="#1a5c2a" roughness={0.95} />
      </mesh>

      {/* Gehwege im Park (Kreisförmig um den Teich) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[pondRadius + 1, pondRadius + 4, 64]} />
        <meshStandardMaterial color="#555555" roughness={0.8} />
      </mesh>

      {/* Äußerer Parkweg */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[parkSize * 0.38, parkSize * 0.40, 64]} />
        <meshStandardMaterial color="#444444" roughness={0.8} />
      </mesh>

      {/* Central Pond — LEUCHTEND CYAN-BLAU */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} ref={waterRef}>
        <circleGeometry args={[pondRadius, 64]} />
        <meshStandardMaterial
          color="#003344"
          emissive="#00ccff"
          emissiveIntensity={2.5}
          roughness={0.05}
          metalness={0.95}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Pond Glow — Kräftiges Cyan-Licht nach oben */}
      <pointLight position={[0, 3, 0]} intensity={3} color="#00ddff" distance={50} decay={1.5} />
      <pointLight position={[0, 0.5, 0]} intensity={2} color="#00ffcc" distance={35} decay={2} />

      {/* Park Trees — Stämme (braun) */}
      <instancedMesh ref={treeTrunkRef} args={[undefined, undefined, treeCount]} receiveShadow castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1, 6]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.9} />
      </instancedMesh>

      {/* Park Trees — Kronen (LEBHAFT GRÜN) */}
      <instancedMesh ref={treeLeavesRef} args={[undefined, undefined, treeCount]} receiveShadow castShadow>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#2d8a3e" roughness={0.85} />
      </instancedMesh>
    </group>
  );
};

export default CentralPark;
