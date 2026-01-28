/**
 * HumanCharacter - High-Poly Procedural Human Model
 * Target: 35.000+ Polygone gemäß AAA Grafik V4.0 Spezifikation
 * 
 * Polygon-Verteilung:
 * - Kopf (inkl. Gesicht): 8.000 Poly
 * - Torso: 6.500 Poly
 * - Arme (beide): 5.000 Poly
 * - Hände (beide): 4.000 Poly
 * - Beine (beide): 4.500 Poly
 * - Füße: 2.000 Poly
 * - Kleidung: 5.000 Poly
 */
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createSkinTexture, createFabricTexture } from '@/utils/ProceduralTextures';

interface HumanCharacterProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    characterType?: 'civilian' | 'demonstrator' | 'police';
    clothingColor?: [number, number, number];
    skinTone?: 'light' | 'medium' | 'dark';
    animate?: boolean;
    segmentMultiplier?: number; // V6.0 LOD support
}

// Base high-poly segment counts
const BASE_SEGMENTS = {
    HEAD_H: 48,
    HEAD_V: 32,
    TORSO: 48,
    LIMB_RADIAL: 24,
    LIMB_HEIGHT: 16,
    HAND_DETAIL: 12,
    FINGER_SEGMENTS: 8,
};

/**
 * Create anatomically correct head with facial features
 * ~8.000 Polygone
 */
function HeadGroup({ skinMaterial, hairColor, SEGMENTS }: { skinMaterial: THREE.Material, hairColor: number, SEGMENTS: any }) {
    // Skull - stretched ellipsoid (1.15x taller, 0.9x deeper)
    const skullGeo = useMemo(() => {
        const geo = new THREE.SphereGeometry(0.11, SEGMENTS.HEAD_H, SEGMENTS.HEAD_V);
        geo.scale(1, 1.15, 0.9);
        return geo;
    }, []);

    // Jaw - wider at back, narrower at chin
    const jawGeo = useMemo(() => new THREE.BoxGeometry(0.16, 0.06, 0.1, 12, 8, 8), []);

    // Nose bridge + tip
    const noseBridgeGeo = useMemo(() => new THREE.BoxGeometry(0.022, 0.045, 0.035, 6, 8, 6), []);
    const noseTipGeo = useMemo(() => new THREE.SphereGeometry(0.016, 16, 16), []);
    const nostrilGeo = useMemo(() => new THREE.SphereGeometry(0.007, 10, 10), []);

    // Eyes
    const eyeSocketGeo = useMemo(() => new THREE.SphereGeometry(0.022, 20, 20), []);
    const eyeballGeo = useMemo(() => new THREE.SphereGeometry(0.013, 20, 20), []);
    const irisGeo = useMemo(() => new THREE.CircleGeometry(0.007, 20), []);
    const pupilGeo = useMemo(() => new THREE.CircleGeometry(0.0035, 12), []);
    const eyelidGeo = useMemo(() => new THREE.SphereGeometry(0.014, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), []);

    // Ears
    const earGeo = useMemo(() => new THREE.TorusGeometry(0.022, 0.007, 12, 24, Math.PI), []);
    const earLobeGeo = useMemo(() => new THREE.SphereGeometry(0.01, 12, 12), []);

    // Lips
    const upperLipGeo = useMemo(() => new THREE.BoxGeometry(0.045, 0.01, 0.018, 12, 6, 6), []);
    const lowerLipGeo = useMemo(() => new THREE.BoxGeometry(0.042, 0.012, 0.016, 12, 6, 6), []);

    // Hair cap
    const hairGeo = useMemo(() => {
        const geo = new THREE.SphereGeometry(0.115, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
        return geo;
    }, []);

    // Neck
    const neckGeo = useMemo(() => {
        const geo = new THREE.CylinderGeometry(0.045, 0.055, 0.12, 20, 8);
        return geo;
    }, []);

    // Materials
    const eyeWhiteMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xFFFAFA, roughness: 0.1 }), []);
    const irisMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x4A6B8A, roughness: 0.3 }), []);
    const pupilMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x000000 }), []);
    const lipMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xCC8888, roughness: 0.5 }), []);
    const hairMat = useMemo(() => new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 }), [hairColor]);

    return (
        <group position={[0, 1.58, 0]}>
            {/* Skull */}
            <mesh geometry={skullGeo} material={skinMaterial} castShadow />

            {/* Jaw */}
            <mesh geometry={jawGeo} material={skinMaterial} position={[0, -0.075, 0.015]} castShadow />

            {/* Nose */}
            <mesh geometry={noseBridgeGeo} material={skinMaterial} position={[0, -0.015, 0.095]} rotation={[0.15, 0, 0]} castShadow />
            <mesh geometry={noseTipGeo} material={skinMaterial} position={[0, -0.035, 0.105]} castShadow />
            <mesh geometry={nostrilGeo} material={skinMaterial} position={[-0.01, -0.045, 0.095]} castShadow />
            <mesh geometry={nostrilGeo} material={skinMaterial} position={[0.01, -0.045, 0.095]} castShadow />

            {/* Left Eye */}
            <group position={[-0.035, 0.015, 0.075]}>
                <mesh geometry={eyeSocketGeo} material={skinMaterial} scale={[1.1, 0.75, 0.5]} />
                <mesh geometry={eyeballGeo} material={eyeWhiteMat} position={[0, 0, 0.008]} />
                <mesh geometry={irisGeo} material={irisMat} position={[0, 0, 0.021]} />
                <mesh geometry={pupilGeo} material={pupilMat} position={[0, 0, 0.022]} />
                <mesh geometry={eyelidGeo} material={skinMaterial} position={[0, 0.003, 0.008]} rotation={[0.3, 0, 0]} />
            </group>

            {/* Right Eye */}
            <group position={[0.035, 0.015, 0.075]}>
                <mesh geometry={eyeSocketGeo} material={skinMaterial} scale={[1.1, 0.75, 0.5]} />
                <mesh geometry={eyeballGeo} material={eyeWhiteMat} position={[0, 0, 0.008]} />
                <mesh geometry={irisGeo} material={irisMat} position={[0, 0, 0.021]} />
                <mesh geometry={pupilGeo} material={pupilMat} position={[0, 0, 0.022]} />
                <mesh geometry={eyelidGeo} material={skinMaterial} position={[0, 0.003, 0.008]} rotation={[0.3, 0, 0]} />
            </group>

            {/* Ears */}
            <group position={[-0.1, 0, 0]} rotation={[0, -Math.PI * 0.5, 0]}>
                <mesh geometry={earGeo} material={skinMaterial} castShadow />
                <mesh geometry={earLobeGeo} material={skinMaterial} position={[0, -0.022, 0]} castShadow />
            </group>
            <group position={[0.1, 0, 0]} rotation={[0, Math.PI * 0.5, 0]}>
                <mesh geometry={earGeo} material={skinMaterial} castShadow />
                <mesh geometry={earLobeGeo} material={skinMaterial} position={[0, -0.022, 0]} castShadow />
            </group>

            {/* Mouth */}
            <mesh geometry={upperLipGeo} material={lipMat} position={[0, -0.055, 0.08]} castShadow />
            <mesh geometry={lowerLipGeo} material={lipMat} position={[0, -0.068, 0.077]} castShadow />

            {/* Hair */}
            <mesh geometry={hairGeo} material={hairMat} position={[0, 0.025, 0]} rotation={[-0.15, 0, 0]} castShadow />

            {/* Neck */}
            <mesh geometry={neckGeo} material={skinMaterial} position={[0, -0.17, -0.01]} castShadow />
        </group>
    );
}

/**
 * Create torso with muscle definition
 * ~6.500 Polygone
 */
function TorsoGroup({ skinMaterial, clothingMaterial, SEGMENTS }: { skinMaterial: THREE.Material, clothingMaterial: THREE.Material, SEGMENTS: any }) {
    // Torso using LatheGeometry for organic shape
    const torsoGeo = useMemo(() => {
        const points: THREE.Vector2[] = [];
        points.push(new THREE.Vector2(0.055, 0.38));   // Neck
        points.push(new THREE.Vector2(0.17, 0.33));   // Shoulders
        points.push(new THREE.Vector2(0.15, 0.2));    // Upper chest
        points.push(new THREE.Vector2(0.13, 0.1));    // Mid chest
        points.push(new THREE.Vector2(0.11, 0));      // Waist
        points.push(new THREE.Vector2(0.13, -0.1));   // Lower abdomen
        points.push(new THREE.Vector2(0.14, -0.18));  // Hips

        return new THREE.LatheGeometry(points, SEGMENTS.TORSO);
    }, []);

    // Shirt covers torso
    const shirtGeo = useMemo(() => {
        const points: THREE.Vector2[] = [];
        points.push(new THREE.Vector2(0.06, 0.4));
        points.push(new THREE.Vector2(0.175, 0.34));
        points.push(new THREE.Vector2(0.155, 0.2));
        points.push(new THREE.Vector2(0.135, 0.1));
        points.push(new THREE.Vector2(0.115, 0));
        points.push(new THREE.Vector2(0.135, -0.06));

        return new THREE.LatheGeometry(points, SEGMENTS.TORSO);
    }, []);

    // Shoulder spheres for muscle definition
    const shoulderGeo = useMemo(() => new THREE.SphereGeometry(0.065, 24, 24), []);

    return (
        <group position={[0, 1.08, 0]}>
            {/* Base torso (skin underneath) */}
            <mesh geometry={torsoGeo} material={skinMaterial} castShadow receiveShadow />

            {/* Shirt */}
            <mesh geometry={shirtGeo} material={clothingMaterial} castShadow receiveShadow />

            {/* Shoulders */}
            <mesh geometry={shoulderGeo} material={clothingMaterial} position={[-0.165, 0.3, 0]} scale={[1.15, 0.8, 0.85]} castShadow />
            <mesh geometry={shoulderGeo} material={clothingMaterial} position={[0.165, 0.3, 0]} scale={[1.15, 0.8, 0.85]} castShadow />
        </group>
    );
}

/**
 * Detailed hand with 5 fingers
 * ~2.000 Polygone pro Hand
 */
function HandGroup({ side, skinMaterial, SEGMENTS }: { side: 'left' | 'right', skinMaterial: THREE.Material, SEGMENTS: any }) {
    const palmGeo = useMemo(() => new THREE.BoxGeometry(0.055, 0.075, 0.022, 10, 12, 6), []);

    // Finger segments with decreasing size
    const fingerBaseGeo = useMemo(() => new THREE.CapsuleGeometry(0.007, 0.022, 6, SEGMENTS.FINGER_SEGMENTS), []);
    const fingerMidGeo = useMemo(() => new THREE.CapsuleGeometry(0.006, 0.018, 6, SEGMENTS.FINGER_SEGMENTS), []);
    const fingerTipGeo = useMemo(() => new THREE.CapsuleGeometry(0.005, 0.014, 6, SEGMENTS.FINGER_SEGMENTS), []);

    const thumbBaseGeo = useMemo(() => new THREE.CapsuleGeometry(0.009, 0.018, 6, SEGMENTS.FINGER_SEGMENTS), []);
    const thumbTipGeo = useMemo(() => new THREE.CapsuleGeometry(0.008, 0.016, 6, SEGMENTS.FINGER_SEGMENTS), []);

    const jointGeo = useMemo(() => new THREE.SphereGeometry(0.007, 10, 10), []);
    const knuckleGeo = useMemo(() => new THREE.SphereGeometry(0.008, 10, 10), []);

    const mirror = side === 'left' ? -1 : 1;

    // Finger positions and lengths (realistic proportions)
    const fingers = [
        { x: -0.018, length: 0.95, label: 'index' },
        { x: -0.006, length: 1.0, label: 'middle' },
        { x: 0.006, length: 0.97, label: 'ring' },
        { x: 0.018, length: 0.75, label: 'pinky' },
    ];

    return (
        <group>
            {/* Palm */}
            <mesh geometry={palmGeo} material={skinMaterial} castShadow />

            {/* Knuckles */}
            {fingers.map((f, i) => (
                <mesh key={`knuckle${i}`} geometry={knuckleGeo} material={skinMaterial} position={[f.x, 0.04, 0]} />
            ))}

            {/* 4 Fingers */}
            {fingers.map((finger, i) => (
                <group key={i} position={[finger.x, 0.05, 0]}>
                    {/* Base segment */}
                    <mesh geometry={fingerBaseGeo} material={skinMaterial} position={[0, 0.018, 0]} castShadow />
                    <mesh geometry={jointGeo} material={skinMaterial} position={[0, 0.04 * finger.length, 0]} />
                    {/* Middle segment */}
                    <mesh geometry={fingerMidGeo} material={skinMaterial} position={[0, 0.058 * finger.length, 0]} castShadow />
                    <mesh geometry={jointGeo} material={skinMaterial} position={[0, 0.076 * finger.length, 0]} />
                    {/* Tip segment */}
                    <mesh geometry={fingerTipGeo} material={skinMaterial} position={[0, 0.09 * finger.length, 0]} castShadow />
                </group>
            ))}

            {/* Thumb (2 segments, different orientation) */}
            <group position={[mirror * 0.03, -0.01, 0]} rotation={[0, 0, mirror * -0.6]}>
                <mesh geometry={thumbBaseGeo} material={skinMaterial} castShadow />
                <mesh geometry={jointGeo} material={skinMaterial} position={[0, 0.022, 0]} />
                <mesh geometry={thumbTipGeo} material={skinMaterial} position={[0, 0.042, 0]} castShadow />
            </group>
        </group>
    );
}

/**
 * Arm with upper, lower, and hand
 * ~2.500 Polygone pro Arm
 */
function ArmGroup({ side, skinMaterial, clothingMaterial, SEGMENTS }: { side: 'left' | 'right', skinMaterial: THREE.Material, clothingMaterial: THREE.Material, SEGMENTS: any }) {
    const upperArmGeo = useMemo(() => new THREE.CapsuleGeometry(0.042, 0.2, 12, SEGMENTS.LIMB_RADIAL), []);
    const lowerArmGeo = useMemo(() => new THREE.CapsuleGeometry(0.032, 0.18, 12, SEGMENTS.LIMB_RADIAL), []);
    const elbowGeo = useMemo(() => new THREE.SphereGeometry(0.036, 20, 20), []);
    const wristGeo = useMemo(() => new THREE.SphereGeometry(0.022, 14, 14), []);
    const sleeveGeo = useMemo(() => new THREE.CapsuleGeometry(0.046, 0.09, 10, 20), []);

    const xPos = side === 'left' ? -0.22 : 0.22;

    return (
        <group position={[xPos, 1.38, 0]}>
            {/* Upper arm */}
            <mesh geometry={upperArmGeo} material={skinMaterial} castShadow />
            {/* Short sleeve */}
            <mesh geometry={sleeveGeo} material={clothingMaterial} position={[0, 0.07, 0]} castShadow />

            {/* Elbow */}
            <mesh geometry={elbowGeo} material={skinMaterial} position={[0, -0.14, 0]} castShadow />

            {/* Lower arm */}
            <mesh geometry={lowerArmGeo} material={skinMaterial} position={[0, -0.3, 0]} castShadow />

            {/* Wrist */}
            <mesh geometry={wristGeo} material={skinMaterial} position={[0, -0.42, 0]} castShadow />

            {/* Hand */}
            <group position={[0, -0.48, 0]}>
                <HandGroup side={side} skinMaterial={skinMaterial} SEGMENTS={SEGMENTS} />
            </group>
        </group>
    );
}

/**
 * Leg with thigh, calf, and foot
 * ~5.250 Polygone pro Bein (inkl. Fuß)
 */
function LegGroup({ side, skinMaterial, pantsMaterial, shoeMaterial, SEGMENTS }: {
    side: 'left' | 'right',
    skinMaterial: THREE.Material,
    pantsMaterial: THREE.Material,
    shoeMaterial: THREE.Material,
    SEGMENTS: any
}) {
    const thighGeo = useMemo(() => new THREE.CapsuleGeometry(0.065, 0.32, 14, SEGMENTS.LIMB_RADIAL), []);
    const calfGeo = useMemo(() => new THREE.CapsuleGeometry(0.05, 0.28, 14, SEGMENTS.LIMB_RADIAL), []);
    const kneeGeo = useMemo(() => new THREE.SphereGeometry(0.05, 20, 20), []);
    const ankleGeo = useMemo(() => new THREE.SphereGeometry(0.028, 14, 14), []);

    // Pants (slightly larger)
    const pantsThighGeo = useMemo(() => new THREE.CapsuleGeometry(0.07, 0.33, 14, SEGMENTS.LIMB_RADIAL), []);
    const pantsCalfGeo = useMemo(() => new THREE.CapsuleGeometry(0.055, 0.29, 14, SEGMENTS.LIMB_RADIAL), []);

    // Foot components
    const footGeo = useMemo(() => new THREE.BoxGeometry(0.07, 0.035, 0.16, 10, 6, 12), []);
    const shoeGeo = useMemo(() => new THREE.BoxGeometry(0.08, 0.045, 0.18, 10, 6, 12), []);
    const soleGeo = useMemo(() => new THREE.BoxGeometry(0.085, 0.018, 0.2, 8, 4, 10), []);

    const xPos = side === 'left' ? -0.09 : 0.09;

    return (
        <group position={[xPos, 0.48, 0]}>
            {/* Thigh - skin underneath */}
            <mesh geometry={thighGeo} material={skinMaterial} castShadow />
            {/* Pants over thigh */}
            <mesh geometry={pantsThighGeo} material={pantsMaterial} castShadow />

            {/* Knee */}
            <mesh geometry={kneeGeo} material={pantsMaterial} position={[0, -0.23, 0.018]} castShadow />

            {/* Calf */}
            <mesh geometry={calfGeo} material={skinMaterial} position={[0, -0.48, 0]} castShadow />
            <mesh geometry={pantsCalfGeo} material={pantsMaterial} position={[0, -0.48, 0]} castShadow />

            {/* Ankle */}
            <mesh geometry={ankleGeo} material={skinMaterial} position={[0, -0.68, 0]} castShadow />

            {/* Foot with shoe */}
            <group position={[0, -0.73, 0.045]}>
                <mesh geometry={footGeo} material={skinMaterial} />
                <mesh geometry={shoeGeo} material={shoeMaterial} position={[0, 0.004, 0]} castShadow />
                <mesh geometry={soleGeo} material={shoeMaterial} position={[0, -0.022, 0.01]} castShadow />
            </group>
        </group>
    );
}

/**
 * Main HumanCharacter Component
 * Total: ~35.000 Polygone
 */
const HumanCharacter: React.FC<HumanCharacterProps> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    clothingColor = [60, 80, 120],
    skinTone = 'medium',
    animate = true,
    segmentMultiplier = 1.0 // V6.0 LOD factor
}) => {
    const groupRef = useRef<THREE.Group>(null);

    // Derived segments based on multiplier
    const SEGMENTS = useMemo(() => ({
        HEAD_H: Math.max(4, Math.floor(BASE_SEGMENTS.HEAD_H * segmentMultiplier)),
        HEAD_V: Math.max(2, Math.floor(BASE_SEGMENTS.HEAD_V * segmentMultiplier)),
        TORSO: Math.max(4, Math.floor(BASE_SEGMENTS.TORSO * segmentMultiplier)),
        LIMB_RADIAL: Math.max(3, Math.floor(BASE_SEGMENTS.LIMB_RADIAL * segmentMultiplier)),
        LIMB_HEIGHT: Math.max(1, Math.floor(BASE_SEGMENTS.LIMB_HEIGHT * segmentMultiplier)),
        HAND_DETAIL: Math.max(2, Math.floor(BASE_SEGMENTS.HAND_DETAIL * segmentMultiplier)),
        FINGER_SEGMENTS: Math.max(1, Math.floor(BASE_SEGMENTS.FINGER_SEGMENTS * segmentMultiplier)),
    }), [segmentMultiplier]);

    // Sub-components need access to SEGMENTS
    // Using SEGMENTS directly in sub-components below

    // Skin material with procedural texture
    const skinMaterial = useMemo(() => {
        const skinColors = {
            light: 0xFFE0D0,
            medium: 0xDDB896,
            dark: 0x8D5524
        };
        return new THREE.MeshStandardMaterial({
            map: createSkinTexture(skinTone),
            color: skinColors[skinTone],
            roughness: 0.7,
            metalness: 0
        });
    }, [skinTone]);

    // Clothing material with fabric texture
    const clothingMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            map: createFabricTexture(clothingColor),
            color: new THREE.Color(clothingColor[0] / 255, clothingColor[1] / 255, clothingColor[2] / 255),
            roughness: 0.85,
            metalness: 0
        });
    }, [clothingColor]);

    // Pants material (darker)
    const pantsMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            map: createFabricTexture([38, 42, 52]),
            color: 0x282C38,
            roughness: 0.8,
            metalness: 0
        });
    }, []);

    // Shoe material
    const shoeMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: 0x181818,
            roughness: 0.55,
            metalness: 0.1
        });
    }, []);

    // Hair color based on skin tone
    const hairColor = useMemo(() => {
        const colors = {
            light: 0x8B6914,
            medium: 0x3D2314,
            dark: 0x1A1A1A
        };
        return colors[skinTone];
    }, [skinTone]);

    // Simple idle animation (subtle breathing/swaying)
    useFrame((state) => {
        if (animate && groupRef.current) {
            const t = state.clock.elapsedTime;
            groupRef.current.position.y = Math.sin(t * 1.5) * 0.003;
        }
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
            <HeadGroup skinMaterial={skinMaterial} hairColor={hairColor} SEGMENTS={SEGMENTS} />
            <TorsoGroup skinMaterial={skinMaterial} clothingMaterial={clothingMaterial} SEGMENTS={SEGMENTS} />
            <ArmGroup side="left" skinMaterial={skinMaterial} clothingMaterial={clothingMaterial} SEGMENTS={SEGMENTS} />
            <ArmGroup side="right" skinMaterial={skinMaterial} clothingMaterial={clothingMaterial} SEGMENTS={SEGMENTS} />
            <LegGroup side="left" skinMaterial={skinMaterial} pantsMaterial={pantsMaterial} shoeMaterial={shoeMaterial} SEGMENTS={SEGMENTS} />
            <LegGroup side="right" skinMaterial={skinMaterial} pantsMaterial={pantsMaterial} shoeMaterial={shoeMaterial} SEGMENTS={SEGMENTS} />
        </group>
    );
};

export default HumanCharacter;
