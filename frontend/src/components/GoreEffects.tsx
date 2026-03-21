import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

const PARTICLE_COUNT = 500;

export const GoreEffects: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const tension = useGameStore((state) => state.tension);
  const emergency = useGameStore((state) => state.emergency);
  
  // Partikel-Daten: Position, Velocity, Life
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        temp.push({
            pos: new THREE.Vector3(),
            vel: new THREE.Vector3((Math.random() - 0.5) * 0.1, Math.random() * 0.2, (Math.random() - 0.5) * 0.1),
            life: Math.random(),
            scale: Math.random() * 0.2
        });
    }
    return temp;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current || tension < 50) return;

    particles.forEach((p, i) => {
        if (p.life <= 0) {
            // Respawn Partikel an zufälligen NPC-Positionen oder im Zentrum bei RIOT
            p.pos.set((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10);
            p.vel.set((Math.random() - 0.5) * 0.2, Math.random() * 0.3, (Math.random() - 0.5) * 0.2);
            p.life = 1.0;
        }

        p.pos.add(p.vel);
        p.vel.y -= 0.01; // Gravity
        p.life -= 0.02;

        dummy.position.copy(p.pos);
        dummy.scale.setScalar(p.life * p.scale);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshStandardMaterial 
        color={emergency === 'CRITICAL' ? '#ff0000' : '#444'} 
        emissive={emergency === 'CRITICAL' ? '#aa0000' : '#000'}
        emissiveIntensity={2}
      />
    </instancedMesh>
  );
};
