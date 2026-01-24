import React from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

interface VanProps {
    position: [number, number, number];
    rotation?: [number, number, number];
}

const Van: React.FC<VanProps> = ({ position, rotation = [0, 0, 0] }) => {
    return (
        <group position={position} rotation={rotation}>
            <RigidBody type="fixed" colliders={false}>
                {/* Body */}
                <mesh castShadow receiveShadow position={[0, 0.8, 0]}>
                    <boxGeometry args={[2.5, 1.8, 5]} />
                    <meshStandardMaterial color="#eeeeee" metalness={0.5} roughness={0.2} />
                </mesh>
                
                {/* Windows */}
                <mesh position={[0, 1.2, 1.5]}>
                    <boxGeometry args={[2.4, 0.6, 1]} />
                    <meshStandardMaterial color="#111" transparent opacity={0.8} />
                </mesh>

                {/* Wheels */}
                {[[-1, 0.3, 1.8], [1, 0.3, 1.8], [-1, 0.3, -1.8], [1, 0.3, -1.8]].map((pos, i) => (
                    <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                ))}

                {/* Collider for the whole van */}
                <CuboidCollider args={[1.25, 0.9, 2.5]} position={[0, 0.8, 0]} />
                
                {/* Static Roof Collider for Krause to stand on */}
                <CuboidCollider args={[1.2, 0.1, 2.2]} position={[0, 1.75, 0]} />
            </RigidBody>
        </group>
    );
};

export default Van;
