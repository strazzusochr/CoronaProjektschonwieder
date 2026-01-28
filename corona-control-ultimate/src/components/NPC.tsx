import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, RapierRigidBody } from '@react-three/rapier';
import type { NPCData, NPCType } from '@/types/npc';

import AISystem from '@/systems/AISystem';
import { NPCAIController } from '@/ai/NPCAIController';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import CameraShakeSystem from '@/systems/CameraShake';
import type { CollisionEnterPayload } from '@react-three/rapier';
import { useParticleStore } from './Effects/ParticleSystem';
import LODHumanCharacter from './characters/LODHumanCharacter';
import NPCFactory from '@/utils/NPCFactory';
import DeescalationManager from '@/systems/DeescalationManager';

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
    const spawnExplosion = useParticleStore(state => state.spawnExplosion);
    const markedNpcIds = useGameStore(state => state.markedNpcIds);

    // V6.0 Deterministic Attributes from Factory
    const attributes = useMemo(() => NPCFactory.generateAttributes(id, type), [id, type]);

    // Initial Data
    const initialData = useMemo<NPCData>(() => {
        return {
            id: id,
            position: position || [(Math.random() - 0.5) * 100, 1, (Math.random() - 0.5) * 100],
            velocity: [0, 0, 0],
            rotation: (id * 1.5) % (Math.PI * 2),
            state: state as any,
            type: type as NPCType,
            faction: attributes.faction,
            relationshipScore: attributes.behavior.relationshipScore,
            aggression: attributes.behavior.aggression,
        };
    }, [id, type, state, position, attributes]);

    const dataRef = useRef<NPCData>(initialData);

    // Register with AI System on Mount
    useEffect(() => {
        const context = {
            id: id,
            type: initialData.type,
            position: new THREE.Vector3(initialData.position[0], initialData.position[1], initialData.position[2]),
            forward: new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), initialData.rotation),
            move: (direction: THREE.Vector3, speed: number) => {
                if (bodyRef.current) {
                    const vel = direction.clone().multiplyScalar(speed * attributes.behavior.speed);
                    bodyRef.current.setLinvel({ x: vel.x, y: bodyRef.current.linvel().y, z: vel.z }, true);
                }
            },
            stop: () => {
                if (bodyRef.current) {
                    bodyRef.current.setLinvel({ x: 0, y: bodyRef.current.linvel().y, z: 0 }, true);
                }
            },
            lookAt: (target: THREE.Vector3) => {
                if (bodyRef.current && meshRef.current) {
                    const myPos = bodyRef.current.translation();
                    const angle = Math.atan2(target.x - myPos.x, target.z - myPos.z);
                    dataRef.current.rotation = angle;
                }
            },
            attack: () => {
                if (attributes.faction === 'RIOTER') {
                    const target = useGameStore.getState().player.position;
                    const myPos = dataRef.current.position;
                    const dir = new THREE.Vector3().subVectors(new THREE.Vector3(...target), new THREE.Vector3(...myPos)).normalize();
                    const dist = new THREE.Vector3(...target).distanceTo(new THREE.Vector3(...myPos));
                    const speed = Math.min(20, dist * 1.5 + 5);
                    const velocity: [number, number, number] = [dir.x * speed, speed * 0.5, dir.z * speed];

                    import('@/systems/CombatSystem').then(mod => {
                        mod.default.spawnProjectile('MOLOTOV', myPos, velocity, 'NPC');
                    });
                }
            }
        };

        controllerRef.current = AISystem.registerNPC(context);
        return () => AISystem.unregisterNPC(id);
    }, [id, initialData, attributes]);

    useEffect(() => {
        if (position) {
            dataRef.current.position = position;
            if (bodyRef.current) {
                bodyRef.current.setTranslation({ x: position[0], y: position[1], z: position[2] }, true);
            }
        }
    }, [position]);

    useFrame((state) => {
        if (bodyRef.current) {
            const pos = bodyRef.current.translation();
            dataRef.current.position = [pos.x, pos.y, pos.z];

            if (controllerRef.current) {
                const ctx = (controllerRef.current as any).context;
                ctx.position.set(pos.x, pos.y, pos.z);
                ctx.forward.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), dataRef.current.rotation);
            }
            bodyRef.current.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dataRef.current.rotation), true);

            // V6.0 Social Interaction Check (Passive)
            // If player is close and not attacking, relationship improves slightly
            const playerPosVector = new THREE.Vector3(...useGameStore.getState().player.position);
            const npcPosVector = new THREE.Vector3(pos.x, pos.y, pos.z);
            if (playerPosVector.distanceTo(npcPosVector) < 3) {
                // Interactive Deescalation (simulated via key or just automatic proximity for now)
                // In a real UI, we would show "[E] To Talk"
                // For autonomy, we increase the score slightly just by staying near peacefully
                DeescalationManager.attemptDeescalation(id, 0.5);
            }
        }

        if (meshRef.current) {
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
            const projectileData = e.other.rigidBodyObject.userData as any;
            const damageType = projectileData?.damageType || 'PHYSICAL';

            spawnExplosion(dataRef.current.position, damageType === 'FIRE' ? 'orange' : 'gray', 5);
            CameraShakeSystem.getInstance().hitShake();

            if (controllerRef.current) {
                controllerRef.current.onSensoryInput('EXPLOSION', new THREE.Vector3(...dataRef.current.position));
            }

            if (attributes.faction === 'RIOTER') {
                addPoints(50);
                updateMissionProgress(1);
            } else {
                addPoints(-10);
            }
        }
    };

    return (
        <RigidBody
            ref={bodyRef}
            colliders={false}
            type="dynamic"
            position={position ? [position[0], position[1], position[2]] : [0, 0, 0]}
            enabledRotations={[false, true, false]}
            userData={{ type: 'npc', id: id, faction: attributes.faction }}
            onCollisionEnter={handleCollision}
        >
            <CapsuleCollider args={[0.5, 0.3]} position={[0, 0.8, 0]} />

            <group ref={meshRef}>
                <LODHumanCharacter
                    characterType={attributes.faction === 'POLICE' ? 'police' : (attributes.faction === 'RIOTER' ? 'demonstrator' : 'civilian')}
                    clothingColor={attributes.visuals.clothingColor}
                    skinTone={attributes.visuals.skinTone}
                    animate={state !== 'ARRESTED'}
                />

                {/* --- Polizei Taschenlampe (Abends/Nachts) --- */}
                {attributes.faction === 'POLICE' && (useGameStore.getState().gameState.dayTime >= 1080 || useGameStore.getState().gameState.dayTime < 360) && (
                    <group position={[0.3, 1.2, 0.4]}>
                        <pointLight
                            color="#fff0dd"
                            intensity={3}
                            distance={8}
                            decay={2}
                        />
                        <mesh rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.02, 0.03, 0.15]} />
                            <meshStandardMaterial color="#222" emissive="#fff" emissiveIntensity={2} />
                        </mesh>
                    </group>
                )}

                {markedNpcIds.includes(id) && (
                    <group position={[0, 2, 0]}>
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
