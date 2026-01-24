import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import type { Item } from '@/stores/gameStore';

// Simple Item Dictionary for now. In a real app, this should be in a data file.
const ITEM_TEMPLATES: Record<string, Omit<Item, 'quantity'>> = {
    'medkit': { id: 'medkit', name: 'Medkit', type: 'CONSUMABLE', description: 'Heilt 50 HP', maxStack: 5, effect: { type: 'HEAL', value: 50 } },
    'stone': { id: 'stone', name: 'Stein', type: 'WEAPON', description: 'Wurfgeschoss', maxStack: 10 }
};

interface WorldItemProps {
    id: string; // Instance ID
    itemId: string; // Template ID
    position: [number, number, number];
}

const WorldItem: React.FC<WorldItemProps> = ({ id, itemId, position }) => {
    // Special handling for Obstacles/Barricades (not in Inventory Templates)
    const isBarricade = itemId === 'barricade';
    
    // Inventory Item Data
    const itemData = ITEM_TEMPLATES[itemId];
    
    const playerPosition = useGameStore(state => state.player.position);
    const addItem = useGameStore(state => state.addItem);
    const removeWorldItem = useGameStore(state => state.removeWorldItem);

    const [isHovered, setIsHovered] = useState(false);
    const itemRef = useRef<THREE.Group>(null);

    useFrame(() => {
        if (!itemRef.current) return;

        // No rotation for Barricades
        if (!isBarricade) {
            itemRef.current.rotation.y += 0.01;
        }

        // Distance Check for Interaction
        if (!isBarricade) {
             const dist = new THREE.Vector3(...position).distanceTo(new THREE.Vector3(...playerPosition));
             const inRange = dist < 2.5;
             if (inRange !== isHovered) setIsHovered(inRange);
        }
    });

    // Interaction Handler (Only for Items)
    React.useEffect(() => {
        if (isBarricade) return;
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isHovered && e.key.toLowerCase() === 'e') {
                if (itemData) {
                    const success = addItem({ ...itemData, quantity: 1 });
                    if (success) {
                        removeWorldItem(id);
                    }
                }
            }
        };

        if (isHovered) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHovered, addItem, removeWorldItem, id, itemData, isBarricade]);

    if (!itemData && !isBarricade) return null;

    if (isBarricade) {
         return (
            <RigidBody position={position} colliders="cuboid" type="dynamic" mass={500} lockRotations>
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[2, 1.2, 0.5]} />
                     {/* Blue/White Police Barrier Style */}
                    <meshStandardMaterial color="#003366" roughness={0.5} metalness={0.8} />
                </mesh>
                <mesh position={[0, 0.4, 0.26]} castShadow> 
                    <planeGeometry args={[1.8, 0.2]} />
                    <meshBasicMaterial color="white" />
                </mesh> 
                <mesh position={[0, 0.4, -0.26]} rotation={[0, Math.PI, 0]} castShadow> 
                    <planeGeometry args={[1.8, 0.2]} />
                    <meshBasicMaterial color="white" />
                </mesh>
            </RigidBody>
         );
    }

    return (
        <RigidBody position={position} colliders="cuboid" type="dynamic">
            <group ref={itemRef}>
                {/* Visual Representation */}
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[0.5, 0.5, 0.5]} />
                    <meshStandardMaterial 
                        color={itemData?.type === 'CONSUMABLE' ? 'red' : 'gray'} 
                        emissive={isHovered ? 'white' : 'black'}
                        emissiveIntensity={0.2}
                    />
                </mesh>

                {/* Interaction Prompt */}
                {isHovered && itemData && (
                    <Html position={[0, 1, 0]} center>
                        <div style={{ 
                            background: 'rgba(0,0,0,0.8)', 
                            color: 'white', 
                            padding: '5px 10px', 
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap',
                            textAlign: 'center'
                        }}>
                            <div>{itemData.name}</div>
                            <div style={{ fontSize: '0.8em', color: '#aaa' }}>[E] Aufheben</div>
                        </div>
                    </Html>
                )}
            </group>
        </RigidBody>
    );
};

export default WorldItem;
