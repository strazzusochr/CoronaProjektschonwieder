import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import { useGameStore } from '@/stores/gameStore';
import * as THREE from 'three';
import CameraShakeSystem from '@/systems/CameraShake';

const MeleeSystem: React.FC = () => {
    const mainHandItem = useGameStore(state => state.equipment.mainHand);
    const [isAttacking, setIsAttacking] = useState(false);
    const sensorRef = useRef<RapierRigidBody>(null);

    // Input handling
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (e.button === 0 && !isAttacking) { // Left click
                const isMelee = !mainHandItem || (mainHandItem.type === 'WEAPON' && !mainHandItem.stats?.range || mainHandItem.stats?.range! < 5);

                if (isMelee) {
                    performAttack();
                }
            }
        };

        window.addEventListener('mousedown', handleMouseDown);
        return () => window.removeEventListener('mousedown', handleMouseDown);
    }, [isAttacking, mainHandItem]);

    const performAttack = () => {
        setIsAttacking(true);
        // Reset after short delay
        setTimeout(() => setIsAttacking(false), 200); // 200ms attack window
    };

    const handleIntersection = (e: any) => {
        if (isAttacking && e.other.rigidBodyObject && e.other.rigidBodyObject.name === 'npc') {
            // Hit an NPC!
            const npcId = e.other.rigidBodyObject.userData?.id;
            console.log("Melee Hit on NPC:", npcId);

            // Apply Impulse (Knockback)
            // Fix: rigidBody property might be nested or direct depending on Rapier version/event
            // Using e.other.rigidBody which should exist on CollisionEnterEvent
            if (e.other.rigidBody) {
                e.other.rigidBody.applyImpulse({ x: 0, y: 5, z: 0 }, true);
            }

            // For prototype: Just log and shake.
            CameraShakeSystem.getInstance().hitShake(0.5);
        }
    };

    return (
        <>
            {isAttacking && (
                <CuboidCollider
                    args={[0.5, 0.5, 0.5]}
                    position={[0, 1, 1]}
                    sensor
                    onIntersectionEnter={handleIntersection}
                />
            )}
        </>
    );
};

export default MeleeSystem;
