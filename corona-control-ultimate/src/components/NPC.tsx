import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { RigidBody, CapsuleCollider, RapierRigidBody } from '@react-three/rapier';
import HumanCharacter from './characters/HumanCharacter';
import { useGameStore } from '../stores/gameStore';
import AudioManager from '../managers/AudioManager';

// AI Behavior Trees
import { Blackboard } from '../ai/BehaviorTree';
import { CivilianBehaviorTree } from '../ai/trees/CivilianBehaviorTree';
import { RioterBehaviorTree } from '../ai/trees/RioterBehaviorTree';
import { PoliceBehaviorTree } from '../ai/trees/PoliceBehaviorTree';

import { NPCType } from '../types/npc';

// --- Types ---
// Local state augmented with 'DEAD' which might not be in the global text status yet
export type NPCState = 'IDLE' | 'WALK' | 'RUN' | 'TALK' | 'FLEE' | 'ATTACK' | 'DEAD';

interface NPCProps {
    id: string;
    position: [number, number, number];
    type: NPCType;
    name?: string;
    initialHealth?: number;
    // AI Params
    patrolPoints?: [number, number, number][];
    behaviorType?: 'passive' | 'aggressive' | 'coward';
    lodLevel?: number; // Override default LOD
}

export const NPC: React.FC<NPCProps> = ({
    id,
    position,
    type,
    name = `NPC-${Math.random().toString(36).substr(2, 5)}`,
    initialHealth = 100,
    patrolPoints = [],
    behaviorType = 'passive',
    lodLevel: overrideLod
}) => {
    // rigidBody used for physics-based position reading
    const rigidBody = useRef<RapierRigidBody>(null);
    const [health, setHealth] = useState(initialHealth);
    const [state, setState] = useState<NPCState>('IDLE');

    // Systems Access
    const { camera } = useThree();
    const tensionLevel = useGameStore(state => state.tensionLevel);

    // Simple LOD Calculation
    const getLOD = () => {
        if (overrideLod !== undefined) return overrideLod;
        const dist = camera.position.distanceTo(new THREE.Vector3(position[0], position[1], position[2]));
        if (dist < 20) return 0;
        if (dist < 50) return 1;
        if (dist < 100) return 2;
        return 3;
    };
    const effectiveLOD = getLOD();
    const isHighQuality = effectiveLOD <= 1;

    // AI Blackboard & Tree
    const blackboard = useMemo(() => new Blackboard(), []);
    const behaviorTree = useMemo(() => {
        // Basic setup for blackboard
        blackboard.set('maxHealth', initialHealth);
        blackboard.set('health', initialHealth);
        blackboard.set('type', type);
        blackboard.set('id', id);
        // CRITICAL: Initialize position immediately to prevent undefined errors
        blackboard.set('position', new THREE.Vector3(position[0], position[1], position[2]));

        // Callbacks for actions
        blackboard.set('setVelocity', (x: number, y: number, z: number) => {
            if (rigidBody.current) {
                rigidBody.current.setLinvel({ x, y, z }, true);
            }
        });

        blackboard.set('setAnimation', (animName: string, loop: boolean) => {
            // Mapping string name to State enum
            let newState: NPCState = 'IDLE';
            if (animName === 'Run') newState = 'RUN';
            if (animName === 'Walk') newState = 'WALK';
            if (animName === 'Punch') newState = 'ATTACK';
            setState(newState);
        });

        blackboard.set('getPosition', () => {
            // Use rigidBody if available, otherwise fallback to initial position
            if (rigidBody.current) {
                const pos = rigidBody.current.translation();
                return new THREE.Vector3(pos.x, pos.y, pos.z);
            }
            return new THREE.Vector3(position[0], position[1], position[2]);
        });

        // Select Tree based on Type
        if (type === 'RIOTER') return new RioterBehaviorTree(blackboard);
        if (type === 'POLICE') return new PoliceBehaviorTree(blackboard);
        return new CivilianBehaviorTree(blackboard);

    }, [type, id, initialHealth, blackboard, position]);

    // Fix: We rotate a visual group INSIDE the RigidBody, not the parent group.
    const visualRef = useRef<THREE.Group>(null);

    // Blackboard updates per frame
    useFrame((state, delta) => {
        // Throttled AI verification (every 10 or so frames random)
        if (Math.random() > 0.9) {

            // Update Blackboard Data
            if (rigidBody.current) {
                const pos = rigidBody.current.translation();
                blackboard.set('position', new THREE.Vector3(pos.x, pos.y, pos.z));
            }

            // Mock Nearby Threats (Triggered by High Tension)
            if (tensionLevel > 50 && Math.random() > 0.95) {
                const threatPos = new THREE.Vector3(0, 0, 0); // Mock threat at center
                blackboard.set('nearbyThreats', [threatPos]);
            } else {
                blackboard.set('nearbyThreats', []);
            }

            // Execute Tree
            behaviorTree.execute();
        }

        // Smooth Rotation handling applied to VISUAL mesh
        const desiredRot = blackboard.get('desiredRotation');
        if (desiredRot !== undefined && visualRef.current) {
            visualRef.current.rotation.y = THREE.MathUtils.lerp(visualRef.current.rotation.y, desiredRot, 0.1);
        }
    });


    // --- Event Handling ---
    const handleDamage = (amount: number) => {
        setHealth(prev => {
            const newHealth = Math.max(0, prev - amount);
            blackboard.set('health', newHealth);
            if (newHealth <= 0) {
                setState('DEAD');
                if (rigidBody.current) {
                    const pos = rigidBody.current.translation();
                    AudioManager.getInstance().playSound3D('death_scream', [pos.x, pos.y, pos.z]);
                }
            } else {
                if (rigidBody.current) {
                    const pos = rigidBody.current.translation();
                    AudioManager.getInstance().playSound3D('hurt_groan', [pos.x, pos.y, pos.z]);
                }
            }
            return newHealth;
        });
    };

    if (state === 'DEAD') return null;

    // Determines clothes based on type
    const getClothesColor = () => {
        if (type === 'POLICE') return '#000033'; // Dark Blue
        if (type === 'RIOTER') return '#330000'; // Dark Red
        return '#444444'; // Grey/Random
    };

    // Map NPC type to HumanCharacter type
    const getCharacterType = (): 'civilian' | 'demonstrator' | 'police' => {
        if (type === 'RIOTER') return 'demonstrator';
        if (type === 'POLICE') return 'police';
        return 'civilian';
    };

    // Convert LOD level to segmentMultiplier (LOD0=1.0, LOD1=0.5, LOD2=0.25)
    const getSegmentMultiplier = () => {
        if (effectiveLOD === 0) return 1.0;
        if (effectiveLOD === 1) return 0.5;
        if (effectiveLOD === 2) return 0.25;
        return 0.1; // Billboard/Low
    };

    // Memoize clothing color to prevent HumanCharacter re-renders and material spam
    const stableClothingColor = useMemo(() => {
        const c = getClothesColor();
        const hex = parseInt(c.replace('#', '0x'));
        return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255] as [number, number, number];
    }, [type]); // Only change if type changes (or we could add id for variety if we randomize)

    return (
        <group position={position} userData={{ id, type, isNPC: true }}>
            <RigidBody
                ref={rigidBody}
                colliders={false}
                lockRotations
                enabledRotations={[false, false, false]}
                linearDamping={0.5}
            >
                <CapsuleCollider args={[0.5, 0.3]} position={[0, 0.8, 0]} />

                {/* VISUALS GROUP - Rotates independently */}
                <group ref={visualRef}>
                    <HumanCharacter
                        characterType={getCharacterType()}
                        segmentMultiplier={getSegmentMultiplier()}
                        animate={true}
                        clothingColor={stableClothingColor}
                    />
                </group>
            </RigidBody>

            {/* Debug UI for High LOD */}
            {isHighQuality && health < 100 && (
                <Html position={[0, 2, 0]}>
                    <div style={{ background: 'red', width: '30px', height: '4px' }}>
                        <div style={{ background: 'green', width: `${health}%`, height: '100%' }} />
                    </div>
                </Html>
            )}
        </group>
    );
};

export default NPC;
