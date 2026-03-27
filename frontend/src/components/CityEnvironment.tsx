/**
 * CityEnvironment — Grid-basierte Skyline mit dichtem Lichtermeer
 * 
 * Gebäude sind in einem dichten Ring um den zentralen Park angeordnet.
 * Jedes Gebäude hat 40+ leuchtende Fenster für den nächtlichen City-Look.
 */

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const dummy = new THREE.Object3D();

export const CityEnvironment: React.FC = () => {
  const buildingCount = 80;
  const windowsPerBuilding = 40;

  const buildingRef = useRef<THREE.InstancedMesh>(null!);
  const windowRef = useRef<THREE.InstancedMesh>(null!);
  const carRef = useRef<THREE.InstancedMesh>(null!);

  useMemo(() => {
    setTimeout(() => {
      if (!buildingRef.current || !windowRef.current) return;
      let windowIdx = 0;
      let bIdx = 0;

      // Gebäude entlang aller 4 Straßenachsen + Ecken platzieren
      const positions: Array<{x: number, z: number}> = [];

      // 4 Straßenbreiten-Blöcke auf jeder Seite
      for (let side = 0; side < 4; side++) {
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 4; col++) {
            // Hauptachse + Tiefe
            const mainAxis = 55 + row * 22;
            const crossAxis = (col - 1.5) * 20;
            
            const x = side % 2 === 0
              ? crossAxis + (Math.random() - 0.5) * 4
              : (side === 1 ? mainAxis : -mainAxis) + (Math.random() - 0.5) * 4;
            const z = side % 2 === 0
              ? (side === 0 ? -mainAxis : mainAxis) + (Math.random() - 0.5) * 4
              : crossAxis + (Math.random() - 0.5) * 4;

            positions.push({ x, z });
          }
        }
      }

      // Gebäude aus Positionen erstellen
      for (const pos of positions) {
        if (bIdx >= buildingCount) break;
        
        const bWidth = 10 + Math.random() * 8;
        const bDepth = 10 + Math.random() * 8;
        const height = 25 + Math.random() * 55;

        dummy.position.set(pos.x, height / 2, pos.z);
        dummy.scale.set(bWidth, height, bDepth);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        buildingRef.current.setMatrixAt(bIdx++, dummy.matrix);

        // Fenster-Lichter auf allen 4 Fassaden
        for (let j = 0; j < windowsPerBuilding; j++) {
          if (windowIdx >= buildingCount * windowsPerBuilding) break;
          
          const side = Math.floor(Math.random() * 4);
          const hOffset = 3 + Math.random() * (height - 6);
          const wOffset = (Math.random() - 0.5) * 0.85;

          // Fenster leicht vor die Fassade setzen
          dummy.scale.set(1.2, 0.8, 0.1);
          if (side === 0) dummy.position.set(pos.x + bWidth / 2 + 0.15, hOffset, pos.z + wOffset * bDepth);
          else if (side === 1) dummy.position.set(pos.x - bWidth / 2 - 0.15, hOffset, pos.z + wOffset * bDepth);
          else if (side === 2) dummy.position.set(pos.x + wOffset * bWidth, hOffset, pos.z + bDepth / 2 + 0.15);
          else dummy.position.set(pos.x + wOffset * bWidth, hOffset, pos.z - bDepth / 2 - 0.15);

          dummy.rotation.set(0, side < 2 ? 0 : Math.PI / 2, 0);
          dummy.updateMatrix();
          windowRef.current.setMatrixAt(windowIdx++, dummy.matrix);
        }
      }

      buildingRef.current.instanceMatrix.needsUpdate = true;
      windowRef.current.instanceMatrix.needsUpdate = true;
    }, 100);
  }, []);

  // Autos auf den Hauptachsen
  useFrame((state: any) => {
    if (!carRef.current) return;
    const t = state.clock.getElapsedTime();
    for (let i = 0; i < 30; i++) {
      const speed = 0.4 + (i % 3) * 0.15;
      const offset = (i * 30) % 300;
      const pos = ((t * 12 * speed) + offset) % 300 - 150;

      if (i % 2 === 0) {
        dummy.position.set(i % 4 === 0 ? 5 : -5, 0.5, pos);
        dummy.rotation.set(0, 0, 0);
      } else {
        dummy.position.set(pos, 0.5, (i - 1) % 4 === 0 ? 5 : -5);
        dummy.rotation.set(0, Math.PI / 2, 0);
      }
      dummy.scale.set(2, 0.8, 4);
      dummy.updateMatrix();
      carRef.current.setMatrixAt(i, dummy.matrix);
    }
    carRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* Ground (dunkel — Asphalt jenseits der Straßen) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#080a0c" roughness={0.95} />
      </mesh>

      {/* Gebäude — Dunkler Beton/Glas Look */}
      <instancedMesh ref={buildingRef} args={[undefined, undefined, buildingCount]} receiveShadow castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#1e2024" roughness={0.25} metalness={0.8} />
      </instancedMesh>

      {/* Fenster-Lichter — Warmgelb */}
      <instancedMesh ref={windowRef} args={[undefined, undefined, buildingCount * windowsPerBuilding]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ffcc44" side={THREE.DoubleSide} transparent opacity={0.95} />
      </instancedMesh>

      {/* Autos */}
      <instancedMesh ref={carRef} args={[undefined, undefined, 30]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.6} />
      </instancedMesh>
    </group>
  );
};
