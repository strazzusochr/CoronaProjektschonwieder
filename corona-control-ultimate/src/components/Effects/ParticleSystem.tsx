import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';

// Globaler Store für Partikel, um sie von überall zu triggern
interface Particle {
    id: number;
    position: [number, number, number];
    velocity: [number, number, number];
    life: number;
    color: string;
}

interface ParticleStore {
    particles: Particle[];
    spawnExplosion: (position: [number, number, number], color: string, count?: number) => void;
    updateParticles: (delta: number) => void;
}

export const useParticleStore = create<ParticleStore>((set, get) => ({
    particles: [],
    spawnExplosion: (position, color, count = 10) => {
        const newParticles: Particle[] = [];
        for (let i = 0; i < count; i++) {
            newParticles.push({
                id: Math.random(),
                position: [...position],
                velocity: [
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 5 + 2, // Etwas nach oben
                    (Math.random() - 0.5) * 5
                ],
                life: 1.0, // 1 Sekunde Lebenszeit
                color: color
            });
        }
        set({ particles: [...get().particles, ...newParticles] });
    },
    updateParticles: (delta) => {
        set((state) => ({
            particles: state.particles
                .map(p => ({
                    ...p,
                    position: [
                        p.position[0] + p.velocity[0] * delta,
                        p.position[1] + p.velocity[1] * delta,
                        p.position[2] + p.velocity[2] * delta
                    ] as [number, number, number],
                    velocity: [
                        p.velocity[0],
                        p.velocity[1] - 9.81 * delta,
                        p.velocity[2]
                    ] as [number, number, number],
                    life: p.life - delta
                }))
                .filter(p => p.life > 0)
        }));
    }
}));

const ParticleSystem: React.FC = () => {
    const particles = useParticleStore(state => state.particles);
    const updateParticles = useParticleStore(state => state.updateParticles);

    useFrame((_, delta) => {
        if (particles.length > 0) {
            updateParticles(delta);
        }
    });

    if (particles.length === 0) return null;

    return (
        <group>
            {particles.map(p => (
                <mesh key={p.id} position={new THREE.Vector3(...p.position)}>
                    <boxGeometry args={[0.1, 0.1, 0.1]} />
                    <meshBasicMaterial color={p.color} transparent opacity={p.life} />
                </mesh>
            ))}
        </group>
    );
};

export default ParticleSystem;
