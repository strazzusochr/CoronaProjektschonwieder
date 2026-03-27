/**
 * StreetLamps — Straßenlaternen (Park-Ring + Hauptstraßen)
 * 
 * Platziert Laternen entlang der Haupt-Verkehrsachsen und am Parkring.
 * Warmes Licht (#ffaa33) beleuchtet die Straßen nachts.
 */

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const dummy = new THREE.Object3D();

interface LampData {
  x: number;
  z: number;
}

export const StreetLamps: React.FC = () => {
  const poleRef = useRef<THREE.InstancedMesh>(null!);
  const bulbRef = useRef<THREE.InstancedMesh>(null!);

  const lamps: LampData[] = useMemo(() => {
    const arr: LampData[] = [];
    
    // Ring um den Park (48m Radius)
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 48;
      arr.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
      });
    }

    // Entlang der N-S Straße
    for (let z = -140; z <= 140; z += 15) {
      if (Math.abs(z) < 46) continue;
      arr.push({ x: 10, z });
      arr.push({ x: -10, z });
    }

    // Entlang der O-W Straße
    for (let x = -140; x <= 140; x += 15) {
      if (Math.abs(x) < 46) continue;
      arr.push({ x, z: 10 });
      arr.push({ x, z: -10 });
    }

    return arr;
  }, []);

  const lampCount = lamps.length;

  useMemo(() => {
    setTimeout(() => {
      if (!poleRef.current || !bulbRef.current) return;
      lamps.forEach((lamp, i) => {
        // Mast
        dummy.position.set(lamp.x, 4, lamp.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        poleRef.current.setMatrixAt(i, dummy.matrix);

        // Lampe oben
        dummy.position.set(lamp.x, 8, lamp.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bulbRef.current.setMatrixAt(i, dummy.matrix);
      });
      poleRef.current.instanceMatrix.needsUpdate = true;
      bulbRef.current.instanceMatrix.needsUpdate = true;
    }, 200);
  }, [lamps]);

  useFrame((state) => {
    if (!bulbRef.current) return;
    const t = state.clock.getElapsedTime();
    const glow = 0.85 + Math.sin(t * 0.3) * 0.15;
    (bulbRef.current.material as THREE.MeshBasicMaterial).opacity = glow;
  });

  return (
    <group>
      {/* Laternen-Masten */}
      <instancedMesh ref={poleRef} args={[undefined, undefined, lampCount]}>
        <cylinderGeometry args={[0.06, 0.1, 8, 6]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} metalness={0.9} />
      </instancedMesh>

      {/* Laternen-Lampen */}
      <instancedMesh ref={bulbRef} args={[undefined, undefined, lampCount]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshBasicMaterial color="#ffcc44" transparent opacity={0.9} />
      </instancedMesh>

      {/* Echte Lichtquellen (nur jede 2. Laterne für Performance) */}
      {lamps.filter((_, i) => i % 2 === 0).map((lamp, i) => (
        <pointLight
          key={i}
          position={[lamp.x, 8.5, lamp.z]}
          intensity={0.6}
          color="#ffaa33"
          distance={20}
          decay={2}
        />
      ))}
    </group>
  );
};

export default StreetLamps;
