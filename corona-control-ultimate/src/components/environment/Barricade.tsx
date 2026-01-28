import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

interface BarricadeProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    type?: 'MOLOTOV_PILE' | 'WOOD_BARRIER' | 'BURNING_TIRE';
}

/**
 * Procedural Barricade Component
 * Hindernis für Spieler und NPCs (NavMesh Blocker theoretisch)
 */
const Barricade: React.FC<BarricadeProps> = ({ position, rotation = [0, 0, 0], type = 'WOOD_BARRIER' }) => {

    // Zufällige Variation für "Schrott-Look"
    const seed = useMemo(() => Math.random(), []);

    // Material
    const woodMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }), []);
    const metalMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.6 }), []);

    const flameLightRef = useRef<THREE.PointLight>(null);
    const flameGroupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (type !== 'BURNING_TIRE') return;
        const time = state.clock.getElapsedTime();

        // Flickering logic
        if (flameLightRef.current) {
            flameLightRef.current.intensity = 8 + Math.sin(time * 12) * 3 + Math.random() * 2;
        }

        // Simple flame movement
        if (flameGroupRef.current) {
            flameGroupRef.current.children.forEach((child, i) => {
                const s = 0.8 + Math.sin(time * 15 + i * 2) * 0.2;
                child.scale.set(s, s, s);
                child.position.y = 0.3 + Math.abs(Math.sin(time * 8 + i)) * 0.2;
            });
        }
    });

    return (
        <RigidBody
            type="dynamic"
            position={position}
            rotation={rotation}
            colliders="cuboid"
            restitution={0.2}
            friction={0.8}
            mass={50} // Schwer, aber verschiebbar
        >
            {type === 'WOOD_BARRIER' && (
                <group>
                    {/* Hauptplatte */}
                    <mesh position={[0, 0.5, 0]}>
                        <boxGeometry args={[2, 1, 0.1]} />
                        <primitive object={woodMat} />
                    </mesh>
                    {/* Stützen */}
                    <mesh position={[-0.8, 0.5, -0.3]} rotation={[0.5, 0, 0]}>
                        <boxGeometry args={[0.1, 1.2, 0.1]} />
                        <primitive object={woodMat} />
                    </mesh>
                    <mesh position={[0.8, 0.5, -0.3]} rotation={[0.5, 0, 0]}>
                        <boxGeometry args={[0.1, 1.2, 0.1]} />
                        <primitive object={woodMat} />
                    </mesh>
                </group>
            )}

            {type === 'MOLOTOV_PILE' && (
                <group>
                    {/* Kistenhaufen */}
                    <mesh position={[0, 0.25, 0]}>
                        <boxGeometry args={[0.5, 0.5, 0.5]} />
                        <primitive object={woodMat} />
                    </mesh>
                    <mesh position={[0.4, 0.25, 0.2]} rotation={[0, 0.5, 0]}>
                        <boxGeometry args={[0.5, 0.5, 0.5]} />
                        <primitive object={woodMat} />
                    </mesh>
                    <mesh position={[0.2, 0.75, 0.1]} rotation={[0, 0.2, 0.1]}>
                        <boxGeometry args={[0.5, 0.5, 0.5]} />
                        <primitive object={woodMat} />
                    </mesh>
                </group>
            )}

            {type === 'BURNING_TIRE' && (
                <group>
                    {/* Reifenform (Torus) */}
                    <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.4, 0.15, 8, 16]} />
                        <meshStandardMaterial color="black" roughness={0.9} />
                    </mesh>
                    {/* Fire Light */}
                    <pointLight
                        ref={flameLightRef}
                        color="#ff6600"
                        distance={6}
                        intensity={0} // Managed by useFrame
                        decay={1.5}
                    />
                    {/* Simple Flame Visuals */}
                    <group ref={flameGroupRef}>
                        <mesh position={[0.1, 0.4, 0]}>
                            <sphereGeometry args={[0.2, 8, 8]} />
                            <meshBasicMaterial color="#ff4400" />
                        </mesh>
                        <mesh position={[-0.1, 0.4, 0.1]}>
                            <sphereGeometry args={[0.15, 8, 8]} />
                            <meshBasicMaterial color="#ff8800" />
                        </mesh>
                        <mesh position={[0, 0.5, -0.1]}>
                            <sphereGeometry args={[0.1, 8, 8]} />
                            <meshBasicMaterial color="#ffcc00" />
                        </mesh>
                    </group>
                </group>
            )}
        </RigidBody>
    );
};

export default Barricade;
