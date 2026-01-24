import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, RapierRigidBody } from '@react-three/rapier';
import type { NPCData, NPCType } from '@/types/npc';
// import { CivilianController, RioterController, PoliceController } from '@/systems/ai/Controllers'; // LEGACY
// import { AIController } from '@/systems/ai/AIController'; // LEGACY
import AISystem from '@/systems/AISystem';
import { NPCAIController } from '@/ai/NPCAIController';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import CameraShakeSystem from '@/systems/CameraShake';
import type { CollisionEnterPayload } from '@react-three/rapier';
import { useParticleStore } from './Effects/ParticleSystem';

interface NPCProps {
    id: number;
    type?: string;
    state?: string;
    position?: [number, number, number];
}

const NPC: React.FC<NPCProps> = ({ id, type = 'TOURIST', state = 'IDLE', position }) => {
    // Refs
    const bodyRef = useRef<RapierRigidBody>(null);
    const meshRef = useRef<THREE.Group>(null);
    const controllerRef = useRef<NPCAIController | null>(null);

    // Game Store
    const addPoints = useGameStore(state => state.addPoints);
    const updateMissionProgress = useGameStore(state => state.updateMissionProgress);
    const playerPos = useGameStore(state => state.player.position);
    const spawnExplosion = useParticleStore(state => state.spawnExplosion);
    const markedNpcIds = useGameStore(state => state.markedNpcIds);

    // Initial Data
    const initialData = useMemo<NPCData>(() => {
        return {
            id: id,
            position: position || [(Math.random() - 0.5) * 60, 1, (Math.random() - 0.5) * 60],
            velocity: [0, 0, 0],
            rotation: Math.random() * Math.PI * 2,
            state: state as any,
            type: type as NPCType,
        };
    }, [id, type, state, position]);

    const dataRef = useRef<NPCData>(initialData);

    // Register with AI System on Mount
    useEffect(() => {
        const context = {
            id: id,
            position: new THREE.Vector3(initialData.position[0], initialData.position[1], initialData.position[2]),
            forward: new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), initialData.rotation),
            // Callbacks for the AI to control the body
            move: (direction: THREE.Vector3, speed: number) => {
                if (bodyRef.current) {
                    const vel = direction.clone().multiplyScalar(speed);
                    bodyRef.current.setLinvel({ x: vel.x, y: bodyRef.current.linvel().y, z: vel.z }, true);
                }
            },
            stop: () => {
                if (bodyRef.current) {
                    bodyRef.current.setLinvel({ x: 0, y: bodyRef.current.linvel().y, z: 0 }, true);
                }
            },
            lookAt: (target: THREE.Vector3) => {
                // Simple instant turn for prototype
                if (bodyRef.current && meshRef.current) {
                    const dummy = meshRef.current.clone();
                    dummy.position.set(dataRef.current.position[0], dataRef.current.position[1], dataRef.current.position[2]);
                    dummy.lookAt(target.x, target.y, target.z);
                    // Sync rotation to ref
                    dataRef.current.rotation = dummy.rotation.y;
                }
            },
            attack: () => {
                console.log(`NPC ${id} attacks!`);
            }
        };

        controllerRef.current = AISystem.registerNPC(context);

        return () => {
            AISystem.unregisterNPC(id);
        };
    }, [id, initialData]);


    // Synchronisation bei Teleport oder Typ-Änderung durch den Store
    useEffect(() => {
        if (position) {
            dataRef.current.position = position;
            if (bodyRef.current) {
                bodyRef.current.setTranslation({ x: position[0], y: position[1], z: position[2] }, true);
            }
        }
        if (type) {
            dataRef.current.type = type as NPCType;
        }
        if (state) {
            dataRef.current.state = state as any;
        }
        // TODO: Inform AI Controller about type/state changes if needed
    }, [position, type, state]);

    useFrame((state, delta) => {
        // Position Sync for Rendering
        if (bodyRef.current) {
            const pos = bodyRef.current.translation();
            dataRef.current.position = [pos.x, pos.y, pos.z];

            // Update Context Position for AI (Crucial!)
            // In a perfect world, AI reads directly from a SharedArrayBuffer or similar, 
            // but here we push the position to the AI Context each frame
            if (controllerRef.current) {
                const ctx = (controllerRef.current as any).context; // Access private context via cast
                ctx.position.set(pos.x, pos.y, pos.z);

                // Update Forward vector based on rotation
                const rotation = dataRef.current.rotation;
                ctx.forward.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
            }
        }

        // Apply Rotation from Data
        if (bodyRef.current) {
            bodyRef.current.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dataRef.current.rotation), true);
        }

        // Animation logic (Simplified)
        if (meshRef.current) {
            // Wiggle if moving
            const vel = bodyRef.current?.linvel();
            const speed = vel ? Math.sqrt(vel.x * vel.x + vel.z * vel.z) : 0;
            if (speed > 0.1) {
                meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 15) * 0.05;
            } else {
                meshRef.current.rotation.z = 0;
            }
        }
    });

    const handleCollision = (e: CollisionEnterPayload) => {
        if (e.other.rigidBodyObject?.name === 'projectile') {
            spawnExplosion(dataRef.current.position, dataRef.current.type === 'RIOTER' ? 'red' : 'orange', 15);
            CameraShakeSystem.getInstance().hitShake();

            // Inform AI about threat!
            if (controllerRef.current) {
                controllerRef.current.onSensoryInput('EXPLOSION', new THREE.Vector3(dataRef.current.position[0], dataRef.current.position[1], dataRef.current.position[2]));
            }

            if (dataRef.current.type === 'RIOTER') {
                addPoints(50);
                updateMissionProgress(1);
                dataRef.current.type = 'CIVILIAN';
            } else {
                addPoints(-10);
            }
        }
    };

    const getColor = (npcType: NPCType | 'KRAUSE', state: string) => {
        // Visual Debugging of AI State
        if (controllerRef.current) {
            const aiState = controllerRef.current.stateMachine.getCurrentStateName();
            if (aiState === 'FLEE') return '#FF00FF'; // Magenta for Fleeing
            if (aiState === 'WANDER') return '#00FFFF'; // Cyan for Wandering
            if (aiState === 'ALERT') return '#FFFF00';
        }

        if (npcType === 'POLICE') return '#002266';
        if (npcType === 'RIOTER') return state === 'ATTACK' ? '#D32F2F' : '#8E0000';
        if (npcType === 'KRAUSE') return '#4e342e';
        if (state === 'PANIC') return '#FF9800';
        return '#7CB342';
    };

    return (
        <RigidBody
            ref={bodyRef}
            type="dynamic" // Changed to dynamic so velocity works!
            enabledRotations={[false, false, false]} // Lock rotation so physics doesn't spin them
            position={initialData.position}
            colliders={false}
            onCollisionEnter={handleCollision}
            userData={{ type: 'npc', id: id, faction: dataRef.current.type }}
            linearDamping={0.5} // Add drag
        >
            <CapsuleCollider args={[0.5, 0.3]} />
            <group ref={meshRef}>
                <mesh castShadow receiveShadow>
                    <capsuleGeometry args={[0.3, 1.4, 4, 8]} />
                    <meshStandardMaterial color={getColor(dataRef.current.type, dataRef.current.state)} />

                    <mesh position={[0, 0.5, 0.25]}>
                        <boxGeometry args={[0.4, 0.15, 0.2]} />
                        <meshStandardMaterial color={dataRef.current.type === 'POLICE' ? 'black' : 'white'} />
                    </mesh>
                </mesh>
                {markedNpcIds.includes(id) && (
                    <group position={[0, 2.2, 0]}>
                        <mesh>
                            <sphereGeometry args={[0.15, 16, 16]} />
                            <meshStandardMaterial color="red" emissive="red" emissiveIntensity={2} />
                        </mesh>
                        <pointLight color="red" intensity={0.5} distance={2} />
                    </group>
                )}
            </group>
        </RigidBody>
    );
};

export default NPC;
