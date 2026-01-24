import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/gameStore';
import { Sphere } from '@react-three/drei';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';

const ProjectileManager: React.FC = () => {
    const projectiles = useGameStore((state) => state.projectiles);
    const removeProjectile = useGameStore((state) => state.removeProjectile);

    return (
        <>
            {projectiles.map((p) => (
                <Projectile 
                    key={p.id} 
                    {...p} 
                    onRemove={() => removeProjectile(p.id)} 
                />
            ))}
        </>
    );
};

const Projectile = ({ position, velocity, type, onRemove }: { 
    id: number; 
    type: 'STONE' | 'MOLOTOV';
    position: [number, number, number]; 
    velocity: [number, number, number];
    onRemove: () => void;
}) => {
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const timeRef = useRef(0);
    const explodedRef = useRef(false);

    // Initial Impulse
    useEffect(() => {
        if (rigidBodyRef.current) {
            rigidBodyRef.current.setLinvel(new THREE.Vector3(...velocity), true);
        }
    }, [velocity]);

    // Removal Timer
    useFrame((_, delta) => {
        timeRef.current += delta;
        if (timeRef.current > 5.0) onRemove(); // Safety cleanup
    });

    const handleCollision = () => {
        if (type === 'MOLOTOV' && !explodedRef.current) {
            explodedRef.current = true;
            // Explosion Visuals
            const pos = rigidBodyRef.current?.translation();
            if (pos) {
                // Visuals
                import('@/components/Effects/ParticleSystem').then(mod => {
                    mod.useParticleStore.getState().spawnExplosion([pos.x, pos.y, pos.z], 'orange', 50);
                });
                
                // Audio
                import('@/managers/AudioManager').then(mod => {
                     mod.default.getInstance().playHitSound(); // Use existing for now to fix build
                });

                // AOE Logic (Panic nearby NPCs)
                const store = useGameStore.getState();
                const range = 5; 
                store.npcs.forEach(npc => {
                    if (!npc.position) return;
                    const distSq = (npc.position[0] - pos.x) ** 2 + (npc.position[2] - pos.z) ** 2;
                    if (distSq < range * range) {
                        // Set to Panic
                        store.updateNpc(npc.id, { state: 'PANIC' });
                        console.log(`NPC ${npc.id} Panicked by Molotov!`);
                    }
                });

                console.log("Molotov Exploded!");
            }
            onRemove();
        }
    };

    return (
        <RigidBody 
            ref={rigidBodyRef} 
            position={position} 
            restitution={0.3} 
            colliders="ball"
            name="projectile"
            userData={{ type: 'projectile', subType: type }}
            onCollisionEnter={handleCollision}
        >
            <Sphere args={[0.15, 8, 8]}>
                <meshStandardMaterial 
                    color={type === 'MOLOTOV' ? "orange" : "gray"} 
                    emissive={type === 'MOLOTOV' ? "red" : "black"} 
                    emissiveIntensity={type === 'MOLOTOV' ? 2 : 0} 
                />
            </Sphere>
            {type === 'MOLOTOV' && <pointLight intensity={2} color="orange" distance={5} />}
        </RigidBody>
    );
};

export default ProjectileManager;
