/**
 * EnvironmentObjects - High-Poly Wiener Straßenmöbel
 * Gemäß AAA Grafik V4.0 Spezifikation
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createMetalTexture, createWoodTexture, createAsphaltTexture, createCobblestoneTexture } from '@/utils/ProceduralTextures';

// Segment counts for high-poly
const SEGMENTS = {
    LAMP_POST: 20,
    LAMP_LANTERN: 16,
    BENCH_DETAIL: 12,
    TREE_TRUNK: 24,
    TREE_LEAVES: 32,
};

interface StreetLampProps {
    position?: [number, number, number];
    isLit?: boolean;
}

/**
 * Historic Viennese Street Lamp
 * ~2.000 Polygone
 */
export const StreetLamp: React.FC<StreetLampProps> = ({
    position = [0, 0, 0],
    isLit = true
}) => {
    // Base with decorative volutes
    const baseGeo = useMemo(() => new THREE.CylinderGeometry(0.2, 0.28, 0.25, SEGMENTS.LAMP_POST, 4), []);
    const baseDetailGeo = useMemo(() => new THREE.TorusGeometry(0.24, 0.035, 10, SEGMENTS.LAMP_POST), []);

    // Post - tapered
    const postGeo = useMemo(() => new THREE.CylinderGeometry(0.055, 0.075, 4.2, SEGMENTS.LAMP_POST, 16), []);

    // Decorative rings
    const ringGeo = useMemo(() => new THREE.TorusGeometry(0.08, 0.015, 8, SEGMENTS.LAMP_POST), []);

    // Arm/bracket
    const armGeo = useMemo(() => {
        const curve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.2, 0.15, 0),
            new THREE.Vector3(0.4, 0.1, 0),
            new THREE.Vector3(0.5, -0.1, 0)
        );
        return new THREE.TubeGeometry(curve, 16, 0.025, 10, false);
    }, []);

    // Lantern case
    const lanternFrameGeo = useMemo(() => new THREE.CylinderGeometry(0.12, 0.14, 0.35, 6, 4), []);
    const lanternTopGeo = useMemo(() => new THREE.ConeGeometry(0.14, 0.12, 6, 4), []);
    const lanternGlassGeo = useMemo(() => new THREE.CylinderGeometry(0.1, 0.11, 0.28, 6, 4), []);

    // Materials
    const metalMat = useMemo(() => new THREE.MeshStandardMaterial({
        map: createMetalTexture(),
        color: 0x2F2F2F,
        roughness: 0.45,
        metalness: 0.75
    }), []);

    const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: isLit ? 0xFFF8E7 : 0xE8E8E8,
        transmission: 0.75,
        roughness: 0.1,
        emissive: isLit ? 0xFFE4B5 : 0x000000,
        emissiveIntensity: isLit ? 0.8 : 0
    }), [isLit]);

    return (
        <group position={position}>
            {/* Base */}
            <mesh geometry={baseGeo} material={metalMat} position={[0, 0.125, 0]} castShadow />
            <mesh geometry={baseDetailGeo} material={metalMat} position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} />

            {/* Post */}
            <mesh geometry={postGeo} material={metalMat} position={[0, 2.35, 0]} castShadow />

            {/* Decorative Rings */}
            {[0.5, 1.5, 3.0, 4.2].map((y, i) => (
                <mesh key={`ring${i}`} geometry={ringGeo} material={metalMat} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} />
            ))}

            {/* Arm */}
            <mesh geometry={armGeo} material={metalMat} position={[0, 4.4, 0]} castShadow />

            {/* Lantern */}
            <group position={[0.5, 4.2, 0]}>
                <mesh geometry={lanternFrameGeo} material={metalMat} castShadow />
                <mesh geometry={lanternTopGeo} material={metalMat} position={[0, 0.22, 0]} castShadow />
                <mesh geometry={lanternGlassGeo} material={glassMat} />

                {/* Light source */}
                {isLit && (
                    <pointLight
                        color={0xFFE4B5}
                        intensity={1.5}
                        distance={18}
                        decay={2}
                    />
                )}
            </group>
        </group>
    );
};

interface ParkBenchProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
}

/**
 * Classic Viennese Park Bench
 * ~3.000 Polygone
 */
export const ParkBench: React.FC<ParkBenchProps> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0]
}) => {
    // Ornamental cast iron legs
    const legGeo = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0.08, 0);
        shape.lineTo(0.08, 0.45);
        shape.quadraticCurveTo(0.12, 0.55, 0.06, 0.65);
        shape.lineTo(0.04, 0.65);
        shape.quadraticCurveTo(0.1, 0.52, 0.04, 0.42);
        shape.lineTo(0.04, 0.08);
        shape.lineTo(0, 0.08);
        shape.closePath();
        return new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.005, bevelSegments: 3 });
    }, []);

    // Armrest
    const armrestGeo = useMemo(() => {
        const curve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0.12, 0.08),
            new THREE.Vector3(0, 0.18, 0.2),
            new THREE.Vector3(0, 0.12, 0.35)
        );
        return new THREE.TubeGeometry(curve, 16, 0.02, 10, false);
    }, []);

    // Seat slats
    const slatGeo = useMemo(() => new THREE.BoxGeometry(1.6, 0.025, 0.08, 20, 2, 6), []);

    // Back slats
    const backSlatGeo = useMemo(() => new THREE.BoxGeometry(1.6, 0.02, 0.07, 20, 2, 6), []);

    // Materials
    const ironMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0x1A1A1A,
        roughness: 0.5,
        metalness: 0.7
    }), []);

    const woodMat = useMemo(() => new THREE.MeshStandardMaterial({
        map: createWoodTexture(),
        color: 0x8B6914,
        roughness: 0.75
    }), []);

    return (
        <group position={position} rotation={rotation}>
            {/* Left leg */}
            <mesh geometry={legGeo} material={ironMat} position={[-0.7, 0, -0.15]} castShadow />
            {/* Right leg */}
            <mesh geometry={legGeo} material={ironMat} position={[0.7, 0, -0.15]} castShadow />

            {/* Left armrest */}
            <mesh geometry={armrestGeo} material={ironMat} position={[-0.75, 0.42, -0.15]} castShadow />
            {/* Right armrest */}
            <mesh geometry={armrestGeo} material={ironMat} position={[0.75, 0.42, -0.15]} castShadow />

            {/* Seat slats */}
            {[0, 0.1, 0.2, 0.3].map((z, i) => (
                <mesh key={`seat${i}`} geometry={slatGeo} material={woodMat} position={[0, 0.44, z - 0.15]} castShadow receiveShadow />
            ))}

            {/* Back slats */}
            {[0.52, 0.62, 0.72].map((y, i) => (
                <mesh key={`back${i}`} geometry={backSlatGeo} material={woodMat} position={[0, y, -0.18]} rotation={[0.15, 0, 0]} castShadow />
            ))}
        </group>
    );
};

interface TrashBinProps {
    position?: [number, number, number];
}

/**
 * Vienna Standard Yellow Trash Bin
 * ~1.500 Polygone
 */
export const TrashBin: React.FC<TrashBinProps> = ({
    position = [0, 0, 0]
}) => {
    // Main body - cylinder
    const bodyGeo = useMemo(() => new THREE.CylinderGeometry(0.18, 0.17, 0.7, 20, 8), []);

    // Lid with opening
    const lidGeo = useMemo(() => new THREE.CylinderGeometry(0.19, 0.19, 0.05, 20, 2), []);
    const openingGeo = useMemo(() => new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16, 2), []);

    // Stand/mount
    const standGeo = useMemo(() => new THREE.CylinderGeometry(0.04, 0.05, 0.9, 12, 4), []);
    const standBaseGeo = useMemo(() => new THREE.CylinderGeometry(0.12, 0.15, 0.08, 16, 2), []);

    // Vienna logo ring
    const logoRingGeo = useMemo(() => new THREE.TorusGeometry(0.18, 0.015, 8, 20), []);

    // Materials
    const yellowMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0xF5B800,
        roughness: 0.55,
        metalness: 0.1
    }), []);

    const metalMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0x3A3A3A,
        roughness: 0.4,
        metalness: 0.8
    }), []);

    const blackMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0x1A1A1A
    }), []);

    return (
        <group position={position}>
            {/* Stand */}
            <mesh geometry={standGeo} material={metalMat} position={[0, 0.45, 0]} castShadow />
            <mesh geometry={standBaseGeo} material={metalMat} position={[0, 0.04, 0]} castShadow />

            {/* Body */}
            <mesh geometry={bodyGeo} material={yellowMat} position={[0, 1.1, 0]} castShadow />

            {/* Logo ring */}
            <mesh geometry={logoRingGeo} material={metalMat} position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} />

            {/* Lid */}
            <mesh geometry={lidGeo} material={yellowMat} position={[0, 1.48, 0]} castShadow />

            {/* Opening (dark) */}
            <mesh geometry={openingGeo} material={blackMat} position={[0, 1.5, 0.08]} rotation={[0.3, 0, 0]} />
        </group>
    );
};

interface TreeProps {
    position?: [number, number, number];
    scale?: number;
    type?: 'linden' | 'chestnut';
}

/**
 * Detailed Tree (Linden/Chestnut style)
 * ~15.000 Polygone
 */
export const Tree: React.FC<TreeProps> = ({
    position = [0, 0, 0],
    scale = 1,
    type = 'linden'
}) => {
    // Trunk with bark texture
    const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.15, 0.25, 3.5, SEGMENTS.TREE_TRUNK, 12), []);

    // Main branches
    const branchGeo = useMemo(() => new THREE.CylinderGeometry(0.03, 0.08, 1.8, 12, 6), []);

    // Leaf clusters (spheres for volume)
    const leafClusterGeo = useMemo(() => new THREE.IcosahedronGeometry(1.2, 2), []);
    const smallClusterGeo = useMemo(() => new THREE.IcosahedronGeometry(0.8, 2), []);

    // Materials
    const barkMat = useMemo(() => new THREE.MeshStandardMaterial({
        map: createWoodTexture([85, 65, 45]),
        color: 0x4A3728,
        roughness: 0.9
    }), []);

    const leafMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: type === 'linden' ? 0x4A7C23 : 0x3D6B1E,
        roughness: 0.8,
        side: THREE.DoubleSide
    }), [type]);

    return (
        <group position={position} scale={scale}>
            {/* Trunk */}
            <mesh geometry={trunkGeo} material={barkMat} position={[0, 1.75, 0]} castShadow />

            {/* Main branches */}
            <mesh geometry={branchGeo} material={barkMat} position={[-0.4, 4, 0]} rotation={[0, 0, -0.4]} castShadow />
            <mesh geometry={branchGeo} material={barkMat} position={[0.4, 4.2, 0]} rotation={[0, 0, 0.35]} castShadow />
            <mesh geometry={branchGeo} material={barkMat} position={[0, 4.4, -0.4]} rotation={[0.3, 0, 0]} castShadow />
            <mesh geometry={branchGeo} material={barkMat} position={[0, 4.1, 0.4]} rotation={[-0.35, 0, 0]} castShadow />

            {/* Leaf canopy (multiple overlapping clusters) */}
            <mesh geometry={leafClusterGeo} material={leafMat} position={[0, 5.5, 0]} castShadow receiveShadow />
            <mesh geometry={leafClusterGeo} material={leafMat} position={[-0.8, 5, 0.3]} scale={0.85} castShadow receiveShadow />
            <mesh geometry={leafClusterGeo} material={leafMat} position={[0.8, 5.1, -0.2]} scale={0.8} castShadow receiveShadow />
            <mesh geometry={leafClusterGeo} material={leafMat} position={[0, 4.8, 0.8]} scale={0.75} castShadow receiveShadow />
            <mesh geometry={leafClusterGeo} material={leafMat} position={[0, 5, -0.7]} scale={0.7} castShadow receiveShadow />

            {/* Smaller fill clusters */}
            <mesh geometry={smallClusterGeo} material={leafMat} position={[-1.2, 4.5, 0.5]} castShadow />
            <mesh geometry={smallClusterGeo} material={leafMat} position={[1.1, 4.6, 0.4]} castShadow />
            <mesh geometry={smallClusterGeo} material={leafMat} position={[0.5, 6, 0]} castShadow />
        </group>
    );
};

interface StreetSegmentProps {
    position?: [number, number, number];
    width?: number;
    length?: number;
}

/**
 * Street segment with asphalt, sidewalk, and curb
 */
export const StreetSegment: React.FC<StreetSegmentProps> = ({
    position = [0, 0, 0],
    width = 8,
    length = 20
}) => {
    // Asphalt road
    const roadGeo = useMemo(() => new THREE.PlaneGeometry(width, length, 32, 64), [width, length]);

    // Sidewalk (elevated)
    const sidewalkGeo = useMemo(() => new THREE.BoxGeometry(2.5, 0.15, length, 16, 2, 32), [length]);

    // Curb
    const curbGeo = useMemo(() => new THREE.BoxGeometry(0.18, 0.18, length, 4, 4, 32), [length]);

    // Materials
    const asphaltMat = useMemo(() => new THREE.MeshStandardMaterial({
        map: createAsphaltTexture(),
        roughness: 0.9
    }), []);

    const cobbleMat = useMemo(() => new THREE.MeshStandardMaterial({
        map: createCobblestoneTexture(),
        roughness: 0.85
    }), []);

    const curbMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0xAAAAAA,
        roughness: 0.75
    }), []);

    return (
        <group position={position}>
            {/* Road surface */}
            <mesh geometry={roadGeo} material={asphaltMat} rotation={[-Math.PI / 2, 0, 0]} receiveShadow />

            {/* Left sidewalk */}
            <mesh geometry={sidewalkGeo} material={cobbleMat} position={[-width / 2 - 1.25, 0.075, 0]} receiveShadow castShadow />
            {/* Right sidewalk */}
            <mesh geometry={sidewalkGeo} material={cobbleMat} position={[width / 2 + 1.25, 0.075, 0]} receiveShadow castShadow />

            {/* Curbs */}
            <mesh geometry={curbGeo} material={curbMat} position={[-width / 2 - 0.09, 0.09, 0]} castShadow />
            <mesh geometry={curbGeo} material={curbMat} position={[width / 2 + 0.09, 0.09, 0]} castShadow />
        </group>
    );
};

// Export all components
export default {
    StreetLamp,
    ParkBench,
    TrashBin,
    Tree,
    StreetSegment
};
