/**
 * LODHumanCharacter - 5-Level Level of Detail for NPCs
 * Gemäß V6.0 Spezifikation Sektion 5.2
 */
import React from 'react';
import { Detailed } from '@react-three/drei';
import HumanCharacter from './HumanCharacter';
import * as THREE from 'three';

interface LODHumanCharacterProps {
    characterType?: 'civilian' | 'demonstrator' | 'police';
    clothingColor?: [number, number, number];
    skinTone?: 'light' | 'medium' | 'dark';
    animate?: boolean;
}

/**
 * Very simplified representation for distant NPCs
 * ~50-100 Polygone
 */
const SimpleAvatar: React.FC<{ color: THREE.Color | number, skinColor: THREE.Color | number }> = ({ color, skinColor }) => (
    <group scale={0.5}>
        {/* Torso */}
        <mesh position={[0, 1.1, 0]}>
            <capsuleGeometry args={[0.15, 0.6, 4, 4]} />
            <meshStandardMaterial color={color} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1.6, 0]}>
            <sphereGeometry args={[0.12, 6, 6]} />
            <meshStandardMaterial color={skinColor} />
        </mesh>
    </group>
);

const LODHumanCharacter: React.FC<LODHumanCharacterProps> = (props) => {
    const skinColors = {
        light: 0xFFE0D0,
        medium: 0xDDB896,
        dark: 0x8D5524
    };
    const currentSkinColor = skinColors[props.skinTone || 'medium'];
    const currentClothingColor = props.clothingColor
        ? new THREE.Color(props.clothingColor[0] / 255, props.clothingColor[1] / 255, props.clothingColor[2] / 255)
        : 0x888888;

    return (
        <Detailed distances={[0, 15, 40, 80, 150]}>
            {/* LOD 0: Ultra High Detail (1.0) */}
            <HumanCharacter {...props} segmentMultiplier={1.0} />

            {/* LOD 1: High Detail (0.5) */}
            <HumanCharacter {...props} segmentMultiplier={0.5} />

            {/* LOD 2: Medium Detail (0.2) */}
            <HumanCharacter {...props} segmentMultiplier={0.2} />

            {/* LOD 3: Low Detail (Simplified) */}
            <SimpleAvatar color={currentClothingColor} skinColor={currentSkinColor} />

            {/* LOD 4: Extreme Distance (Billboard Placeholder / Nothing) */}
            <mesh scale={0.2}>
                <boxGeometry args={[1, 2, 1]} />
                <meshBasicMaterial color={currentClothingColor} />
            </mesh>
        </Detailed>
    );
};

export default LODHumanCharacter;
