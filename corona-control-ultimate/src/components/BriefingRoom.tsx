import React from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

const BriefingRoom: React.FC = () => {
    return (
        <group position={[100, 0, 100]}> {/* Weitab vom Stephansplatz */}
            {/* Boden */}
            <RigidBody type="fixed">
                 <CuboidCollider args={[10, 0.1, 10]} />
                 <mesh receiveShadow>
                     <boxGeometry args={[20, 0.2, 20]} />
                     <meshStandardMaterial color="#333" />
                 </mesh>
            </RigidBody>

            {/* Wände */}
            <mesh position={[0, 2, -10]}>
                <boxGeometry args={[20, 4, 0.2]} />
                <meshStandardMaterial color="#444" />
            </mesh>
            
            {/* Leinwand Placeholder */}
            <mesh position={[0, 2, -9.8]}>
                <planeGeometry args={[6, 4]} />
                <meshStandardMaterial color="#111" emissive="#222" />
            </mesh>

            {/* Tisch */}
            <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={[8, 1, 4]} />
                <meshStandardMaterial color="#2d1b0d" />
            </mesh>
            
            {/* Hauptmann Weber (Blau) */}
            <mesh position={[0, 1, -8]}>
                <capsuleGeometry args={[0.4, 1, 4, 8]} />
                <meshStandardMaterial color="blue" />
            </mesh>

            {/* Inspektorin Kovacs (Dunkelblau) */}
            <mesh position={[2, 1, 0]}>
                <capsuleGeometry args={[0.35, 1, 4, 8]} />
                <meshStandardMaterial color="#000033" />
            </mesh>

            {/* Weitere Polizisten */}
            <mesh position={[-2, 1, 0]}>
                <capsuleGeometry args={[0.35, 1, 4, 8]} />
                <meshStandardMaterial color="#000033" />
            </mesh>

            <ambientLight intensity={0.5} />
            <pointLight position={[0, 3, 0]} intensity={1.5} castShadow />
        </group>
    );
};

export default BriefingRoom;
