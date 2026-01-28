import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
// import CombatSystem from '@/systems/CombatSystem'; // Dynamic import later to avoid cycles if needed

interface WaWeProps {
    position: [number, number, number];
    rotation?: [number, number, number];
}

export const WaterCannonVehicle: React.FC<WaWeProps> = ({ position, rotation = [0, 0, 0] }) => {
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const turretRef = useRef<THREE.Group>(null);
    const nozzleRef = useRef<THREE.Group>(null);
    const blueLightRef = useRef<THREE.PointLight>(null);
    const strobeMeshLRef = useRef<THREE.Mesh>(null);
    const strobeMeshRRef = useRef<THREE.Mesh>(null);

    // State
    const [isFiring, setIsFiring] = useState(false);

    // Materials
    const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x003366, roughness: 0.3, metalness: 0.8 }), []); // Polizei Blau
    const glassMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6, roughness: 0.1 }), []);

    // Water Particle System (Simple Mockup)
    const waterParticles = useRef<THREE.InstancedMesh>(null);
    const dummy = new THREE.Object3D();
    const particleCount = 100;
    const particleData = useMemo(() => {
        return new Array(particleCount).fill(0).map(() => ({
            pos: new THREE.Vector3(),
            vel: new THREE.Vector3(),
            life: 0,
            active: false
        }));
    }, []);

    useFrame((state, delta) => {
        if (!rigidBodyRef.current) return;

        // 1. Particle Logic
        if (waterParticles.current) {
            let activeCount = 0;

            // Spawn new particles if firing
            if (isFiring) {
                // Spawn rate
                const spawnRate = 5; // per frame
                for (let i = 0; i < spawnRate; i++) {
                    const p = particleData.find(p => !p.active);
                    if (p && nozzleRef.current) {
                        p.active = true;
                        p.life = 2.0; // 2 seconds

                        // Get world pos of nozzle
                        const nozzleWorldPos = new THREE.Vector3();
                        nozzleRef.current.getWorldPosition(nozzleWorldPos);
                        p.pos.copy(nozzleWorldPos);

                        // Get world dir
                        const nozzleWorldDir = new THREE.Vector3();
                        nozzleRef.current.getWorldDirection(nozzleWorldDir);

                        // Add spread
                        const spread = 0.1;
                        nozzleWorldDir.x += (Math.random() - 0.5) * spread;
                        nozzleWorldDir.y += (Math.random() - 0.5) * spread;
                        nozzleWorldDir.z += (Math.random() - 0.5) * spread;
                        nozzleWorldDir.normalize();

                        p.vel.copy(nozzleWorldDir).multiplyScalar(20); // 20 m/s speed
                    }
                }
            }

            // Update physics
            particleData.forEach((p, i) => {
                if (p.active) {
                    p.life -= delta;
                    if (p.life <= 0 || p.pos.y < 0) {
                        p.active = false;
                        p.pos.set(0, -999, 0); // Hide
                    } else {
                        // Gravity
                        p.vel.y -= 9.81 * delta;
                        p.pos.add(p.vel.clone().multiplyScalar(delta));

                        // Interaction/Damage Logic
                        // Raycast or simple distance check to NPCs?
                        // For performance: CombatSystem should handle this via spatial query?
                        // Here we just do visual update. 
                        // Actual effect could be handled by a single raycast from turret center.

                        activeCount++;
                    }

                    dummy.position.copy(p.pos);
                    dummy.scale.setScalar(Math.max(0.1, p.life * 0.5)); // Shrink over time
                    dummy.updateMatrix();
                    waterParticles.current.setMatrixAt(i, dummy.matrix);
                } else {
                    dummy.position.set(0, -999, 0);
                    dummy.updateMatrix();
                    waterParticles.current.setMatrixAt(i, dummy.matrix);
                }
            });
            if (waterParticles.current) {
                waterParticles.current.instanceMatrix.needsUpdate = true;
            }

            // Combat Logic (Simplified: One Raycast from Turret)
            if (isFiring && nozzleRef.current) {
                // Import dynamisch triggern
                import('@/systems/CombatSystem').then(cs => {
                    const origin = new THREE.Vector3();
                    const direction = new THREE.Vector3();
                    nozzleRef.current!.getWorldPosition(origin);
                    nozzleRef.current!.getWorldDirection(direction);

                    // Helper: applyHydroForce(origin, direction, range, width, force)
                    if (cs.default.applyHydroForce) {
                        cs.default.applyHydroForce(origin, direction, 20, 2.0, 50);
                    }
                });
            }
        }

        // Debug Control: Auto-Fire periodically
        // setIsFiring(state.clock.getElapsedTime() % 5 < 2);

        // Manual Override via Store/Input? For now: Always fire for demo if User presses key?
        // Let's assume TacticsManager controls this later.
        // For test: Fire permanently
        setIsFiring(true);

        // Turret Rotation (Demo)
        if (turretRef.current) {
            turretRef.current.rotation.y = Math.sin(state.clock.getElapsedTime()) * 0.5;
        }

        // Emergency Light Logic (Strobe)
        const time = state.clock.getElapsedTime();
        const cycle = 0.8;
        const phase = time % cycle;
        const isFlashing = (phase < 0.1) || (phase > 0.2 && phase < 0.3);

        if (blueLightRef.current) blueLightRef.current.intensity = isFlashing ? 25 : 0;
        if (strobeMeshLRef.current) (strobeMeshLRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = isFlashing ? 15 : 0;
        if (strobeMeshRRef.current) (strobeMeshRRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = isFlashing ? 15 : 0;
    });

    return (
        <group>
            <RigidBody
                ref={rigidBodyRef}
                type="kinematicPosition" // AI gesteuert, fährt festen Pfad/NavMesh
                position={position}
                rotation={rotation}
                colliders="cuboid"
            >
                {/* --- CHASSIS (WaWe 10000 style) --- */}
                {/* Main Body */}
                <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2.5, 3, 8]} /> {/* 2.5m breit, 3m hoch + Räder, 8m lang */}
                    <primitive object={bodyMat} />
                </mesh>

                {/* Cabin */}
                <mesh position={[0, 2, 3]} castShadow receiveShadow>
                    <boxGeometry args={[2.4, 1.5, 1.8]} />
                    <primitive object={glassMat} />
                </mesh>

                {/* Wheels (Visual only) */}
                <mesh position={[1.3, 0.5, 2.5]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.5, 0.5, 0.4]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                <mesh position={[-1.3, 0.5, 2.5]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.5, 0.5, 0.4]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                <mesh position={[1.3, 0.5, -2.5]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.5, 0.5, 0.4]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                <mesh position={[-1.3, 0.5, -2.5]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.5, 0.5, 0.4]} />
                    <meshStandardMaterial color="black" />
                </mesh>

                {/* --- TURRET --- */}
                <group ref={turretRef} position={[0, 3.1, 2.5]}>
                    <mesh castShadow>
                        <boxGeometry args={[0.8, 0.8, 0.8]} />
                        <primitive object={bodyMat} />
                    </mesh>

                    {/* Nozzle */}
                    <group ref={nozzleRef} position={[0, 0.2, 0.5]}>
                        <mesh rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.1, 0.15, 0.8]} />
                            <meshStandardMaterial color="grey" />
                        </mesh>
                    </group>
                </group>

                {/* --- LATERNE / BLAULICHT --- */}
                <group position={[0, 3, 3]}>
                    <pointLight
                        ref={blueLightRef}
                        color="#0088ff"
                        intensity={0}
                        distance={15}
                        decay={2}
                    />
                    <mesh ref={strobeMeshLRef} position={[-0.8, 0, 0]}>
                        <boxGeometry args={[0.3, 0.2, 0.4]} />
                        <meshStandardMaterial
                            color="#002244"
                            emissive="#0088ff"
                            emissiveIntensity={0}
                        />
                    </mesh>
                    <mesh ref={strobeMeshRRef} position={[0.8, 0, 0]}>
                        <boxGeometry args={[0.3, 0.2, 0.4]} />
                        <meshStandardMaterial
                            color="#002244"
                            emissive="#0088ff"
                            emissiveIntensity={0}
                        />
                    </mesh>
                </group>

                {/* --- Particles --- */}
                <instancedMesh ref={waterParticles} args={[undefined, undefined, particleCount]} frustumCulled={false}>
                    <sphereGeometry args={[0.2, 8, 8]} /> {/* Water blobs */}
                    <meshBasicMaterial color="#aaddff" transparent opacity={0.5} />
                </instancedMesh>

            </RigidBody>
        </group>
    );
};

export default WaterCannonVehicle;
