/**
 * VienneseBuilding - High-Poly Wiener Gründerzeit-Architektur
 * Target: 60.000-80.000 Polygone gemäß AAA Grafik V4.0 Spezifikation
 * 
 * Polygon-Verteilung:
 * - Erdgeschoss: 15.000 Poly
 * - Hauptgeschosse (3-4 Stock): 30.000 Poly
 * - Dachzone: 15.000 Poly
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createBrickTexture, createConcreteTexture } from '@/utils/ProceduralTextures';

// High-poly segment counts
const SEGMENTS = {
    WINDOW_FRAME: 8,
    BALCONY: 16,
    ORNAMENT: 12,
    COLUMN: 24,
    CORNICE: 32,
};

interface VienneseBuildingProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    floors?: number;
    width?: number;
    depth?: number;
    style?: 'classic' | 'ornate';
}

/**
 * Detailed Window with Frame, Glass, Sill, and Verdachung
 * ~800 Polygone pro Fenster
 */
function WindowModule({
    width = 1.2,
    height = 1.8,
    position
}: {
    width?: number,
    height?: number,
    position: [number, number, number]
}) {
    const frameDepth = 0.12;
    const frameWidth = 0.08;
    const sillDepth = 0.2;

    // Frame geometries with detail
    const frameTopGeo = useMemo(() => new THREE.BoxGeometry(width + frameWidth * 2, frameWidth, frameDepth, SEGMENTS.WINDOW_FRAME, 2, 2), [width]);
    const frameSideGeo = useMemo(() => new THREE.BoxGeometry(frameWidth, height, frameDepth, 2, SEGMENTS.WINDOW_FRAME, 2), [height]);
    const frameBottomGeo = useMemo(() => new THREE.BoxGeometry(width + frameWidth * 2, frameWidth, frameDepth, SEGMENTS.WINDOW_FRAME, 2, 2), [width]);

    // Window sill (Sohlbank)
    const sillGeo = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2 - 0.08, 0);
        shape.lineTo(width / 2 + 0.08, 0);
        shape.lineTo(width / 2 + 0.08, sillDepth);
        shape.lineTo(-width / 2 - 0.08, sillDepth);
        shape.closePath();
        return new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 3 });
    }, [width, sillDepth]);

    // Verdachung (Window pediment) - triangular
    const pedimentGeo = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2 - 0.12, 0);
        shape.lineTo(0, 0.18);
        shape.lineTo(width / 2 + 0.12, 0);
        shape.closePath();
        return new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.015, bevelSegments: 3 });
    }, [width]);

    // Glass with subdivisions for reflections
    const glassGeo = useMemo(() => new THREE.PlaneGeometry(width, height, 8, 12), [width, height]);

    // Window cross (Fensterkreuz)
    const crossVertGeo = useMemo(() => new THREE.BoxGeometry(0.025, height * 0.95, 0.02, 2, 12, 2), [height]);
    const crossHorzGeo = useMemo(() => new THREE.BoxGeometry(width * 0.95, 0.025, 0.02, 12, 2, 2), [width]);

    // Materials
    const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xF5F0E6, roughness: 0.55, metalness: 0 }), []);
    const stoneMat = useMemo(() => new THREE.MeshStandardMaterial({
        map: createConcreteTexture(512),
        color: 0xD8CDB8,
        roughness: 0.75
    }), []);
    const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: 0xE8F4EC,
        transmission: 0.88,
        roughness: 0.05,
        metalness: 0,
        ior: 1.48,
        thickness: 0.01
    }), []);

    return (
        <group position={position}>
            {/* Frame */}
            <mesh geometry={frameTopGeo} material={frameMat} position={[0, height / 2 + frameWidth / 2, 0]} castShadow />
            <mesh geometry={frameBottomGeo} material={frameMat} position={[0, -height / 2 - frameWidth / 2, 0]} castShadow />
            <mesh geometry={frameSideGeo} material={frameMat} position={[-width / 2 - frameWidth / 2, 0, 0]} castShadow />
            <mesh geometry={frameSideGeo} material={frameMat} position={[width / 2 + frameWidth / 2, 0, 0]} castShadow />

            {/* Window Cross */}
            <mesh geometry={crossVertGeo} material={frameMat} position={[0, 0, 0.01]} castShadow />
            <mesh geometry={crossHorzGeo} material={frameMat} position={[0, height * 0.12, 0.01]} castShadow />

            {/* Glass */}
            <mesh geometry={glassGeo} material={glassMat} position={[0, 0, -0.02]} />

            {/* Sill */}
            <mesh geometry={sillGeo} material={stoneMat} position={[0, -height / 2 - frameWidth, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow />

            {/* Pediment */}
            <mesh geometry={pedimentGeo} material={stoneMat} position={[0, height / 2 + frameWidth + 0.08, -0.01]} rotation={[Math.PI / 2, 0, 0]} castShadow />
        </group>
    );
}

/**
 * Balcony with wrought iron railing
 * ~1.500 Polygone pro Balkon
 */
function BalconyModule({ width = 1.6, depth = 0.7, position }: { width?: number, depth?: number, position: [number, number, number] }) {
    // Floor plate with ornamental underside
    const floorGeo = useMemo(() => new THREE.BoxGeometry(width, 0.1, depth, 16, 4, 8), [width, depth]);

    // Console supports
    const consoleGeo = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0.15, 0);
        shape.lineTo(0.15, -0.2);
        shape.quadraticCurveTo(0.12, -0.35, 0, -0.4);
        shape.closePath();
        return new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.01, bevelSegments: 3 });
    }, []);

    // Railing posts
    const postGeo = useMemo(() => new THREE.CylinderGeometry(0.012, 0.012, 0.9, SEGMENTS.BALCONY, 6), []);
    const railGeo = useMemo(() => new THREE.BoxGeometry(width, 0.035, 0.035, 16, 2, 2), [width]);

    // Ornamental ironwork
    const scrollGeo = useMemo(() => new THREE.TorusGeometry(0.04, 0.008, 10, 16, Math.PI * 1.5), []);

    const stoneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xD8CDB8, roughness: 0.7 }), []);
    const ironMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1A1A1A, roughness: 0.45, metalness: 0.75 }), []);

    const postPositions = [-width / 2 + 0.05, -width / 4, 0, width / 4, width / 2 - 0.05];

    return (
        <group position={position}>
            {/* Floor */}
            <mesh geometry={floorGeo} material={stoneMat} castShadow receiveShadow />

            {/* Consoles */}
            <mesh geometry={consoleGeo} material={stoneMat} position={[-width / 2 + 0.2, 0, -depth / 2 + 0.05]} rotation={[0, -Math.PI / 2, 0]} castShadow />
            <mesh geometry={consoleGeo} material={stoneMat} position={[width / 2 - 0.2, 0, -depth / 2 + 0.05]} rotation={[0, Math.PI / 2, 0]} castShadow />

            {/* Railing Posts (front) */}
            {postPositions.map((x, i) => (
                <mesh key={`post${i}`} geometry={postGeo} material={ironMat} position={[x, 0.5, depth / 2 - 0.03]} castShadow />
            ))}

            {/* Railing Posts (sides) */}
            <mesh geometry={postGeo} material={ironMat} position={[-width / 2 + 0.03, 0.5, depth / 4]} castShadow />
            <mesh geometry={postGeo} material={ironMat} position={[width / 2 - 0.03, 0.5, depth / 4]} castShadow />

            {/* Top Rail */}
            <mesh geometry={railGeo} material={ironMat} position={[0, 0.95, depth / 2 - 0.03]} castShadow />

            {/* Ornamental Scrolls */}
            {[-width / 4, width / 4].map((x, i) => (
                <mesh key={`scroll${i}`} geometry={scrollGeo} material={ironMat} position={[x, 0.4, depth / 2 - 0.03]} rotation={[0, 0, Math.PI / 2]} castShadow />
            ))}
        </group>
    );
}

/**
 * Cornice (Gesims) - ornamental horizontal band
 */
function CorniceModule({ width, zOffset = 0 }: { width: number, zOffset?: number }) {
    const corniceGeo = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0.25, 0);
        shape.lineTo(0.25, 0.04);
        shape.lineTo(0.2, 0.06);
        shape.lineTo(0.2, 0.12);
        shape.lineTo(0.05, 0.12);
        shape.lineTo(0.05, 0.08);
        shape.lineTo(0, 0.08);
        shape.closePath();
        return new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
    }, [width]);

    const stoneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xE8DED0, roughness: 0.65 }), []);

    return (
        <mesh geometry={corniceGeo} material={stoneMat} position={[-width / 2, 0, zOffset]} rotation={[0, Math.PI / 2, 0]} castShadow />
    );
}

/**
 * Main Viennese Gründerzeit Building
 * Total: ~60.000-80.000 Polygone
 */
const VienneseBuilding: React.FC<VienneseBuildingProps> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    floors = 5,
    width = 18,
    depth = 12
}) => {
    const groundFloorHeight = 4.2;
    const upperFloorHeight = 3.4;
    const totalHeight = groundFloorHeight + (floors - 1) * upperFloorHeight;
    const windowsPerFloor = Math.floor((width - 3) / 3.2);

    // Wall material with brick texture
    const wallMat = useMemo(() => new THREE.MeshStandardMaterial({
        map: createBrickTexture(),
        color: 0xE8DCC8,
        roughness: 0.75
    }), []);

    // Stucco material for ornaments
    const stuccoMat = useMemo(() => new THREE.MeshStandardMaterial({
        map: createConcreteTexture(512),
        color: 0xF5F0E8,
        roughness: 0.6
    }), []);

    // Rustika (ground floor stone work)
    const rustikaMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0xC8BFA8,
        roughness: 0.8
    }), []);

    // Roof material
    const roofMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0x4A4A4A,
        roughness: 0.85
    }), []);

    // Wall geometries
    const frontWallGeo = useMemo(() => new THREE.BoxGeometry(width, totalHeight, 0.4, 32, 64, 2), [width, totalHeight]);
    const sideWallGeo = useMemo(() => new THREE.BoxGeometry(0.4, totalHeight, depth, 2, 64, 16), [totalHeight, depth]);

    // Ground floor rustika band
    const rustikaGeo = useMemo(() => new THREE.BoxGeometry(width + 0.05, groundFloorHeight, 0.15, 32, 16, 2), [width, groundFloorHeight]);

    // Pilaster (decorative columns)
    const pilasterGeo = useMemo(() => new THREE.BoxGeometry(0.25, totalHeight - groundFloorHeight, 0.08, 4, 48, 2), [totalHeight, groundFloorHeight]);

    // Roof structure
    const roofGeo = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2 - 0.25, 0);
        shape.lineTo(-width / 2 + 1.5, 3.5);
        shape.lineTo(width / 2 - 1.5, 3.5);
        shape.lineTo(width / 2 + 0.25, 0);
        shape.closePath();
        return new THREE.ExtrudeGeometry(shape, { depth: depth + 0.4, bevelEnabled: false });
    }, [width, depth]);

    // Chimney
    const chimneyGeo = useMemo(() => new THREE.BoxGeometry(0.7, 1.8, 0.5, 6, 12, 6), []);

    // Kranzgesims (crown molding)
    const kranzGeo = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0.35, 0);
        shape.lineTo(0.35, 0.08);
        shape.lineTo(0.28, 0.12);
        shape.lineTo(0.28, 0.22);
        shape.lineTo(0.18, 0.26);
        shape.lineTo(0, 0.26);
        shape.closePath();
        return new THREE.ExtrudeGeometry(shape, { depth: width + 0.4, bevelEnabled: false });
    }, [width]);

    return (
        <group position={position} rotation={rotation}>
            {/* WALLS */}
            {/* Front wall */}
            <mesh geometry={frontWallGeo} material={wallMat} position={[0, totalHeight / 2, depth / 2]} castShadow receiveShadow />
            {/* Back wall */}
            <mesh geometry={frontWallGeo} material={wallMat} position={[0, totalHeight / 2, -depth / 2]} castShadow receiveShadow />
            {/* Side walls */}
            <mesh geometry={sideWallGeo} material={wallMat} position={[-width / 2, totalHeight / 2, 0]} castShadow receiveShadow />
            <mesh geometry={sideWallGeo} material={wallMat} position={[width / 2, totalHeight / 2, 0]} castShadow receiveShadow />

            {/* GROUND FLOOR - Rustika */}
            <mesh geometry={rustikaGeo} material={rustikaMat} position={[0, groundFloorHeight / 2, depth / 2 + 0.07]} castShadow />

            {/* GROUND FLOOR WINDOWS (larger) */}
            {Array.from({ length: Math.floor(windowsPerFloor / 2) }).map((_, i) => (
                <React.Fragment key={`gw${i}`}>
                    <WindowModule position={[-(i + 1) * 3.2 - 1, groundFloorHeight / 2 + 0.4, depth / 2 + 0.2]} width={1.4} height={2.2} />
                    <WindowModule position={[(i + 1) * 3.2 + 1, groundFloorHeight / 2 + 0.4, depth / 2 + 0.2]} width={1.4} height={2.2} />
                </React.Fragment>
            ))}

            {/* Door/Entrance Portal */}
            <group position={[0, groundFloorHeight / 2, depth / 2 + 0.25]}>
                <mesh>
                    <boxGeometry args={[2.2, groundFloorHeight - 0.5, 0.4]} />
                    <meshStandardMaterial color={0x3D2817} roughness={0.6} />
                </mesh>
            </group>

            {/* UPPER FLOORS */}
            {Array.from({ length: floors - 1 }).map((_, floor) => (
                <React.Fragment key={`floor${floor}`}>
                    {/* Floor divider cornice */}
                    <CorniceModule width={width + 0.2} zOffset={depth / 2 + 0.12} />

                    {/* Windows per floor */}
                    {Array.from({ length: windowsPerFloor }).map((_, win) => {
                        const x = (win - (windowsPerFloor - 1) / 2) * 3.2;
                        const y = groundFloorHeight + floor * upperFloorHeight + upperFloorHeight / 2 + 0.2;
                        const hasBalcony = floor === 0 && (win === 0 || win === windowsPerFloor - 1 || win === Math.floor(windowsPerFloor / 2));

                        return (
                            <React.Fragment key={`w${floor}_${win}`}>
                                <WindowModule position={[x, y, depth / 2 + 0.2]} />
                                {hasBalcony && (
                                    <BalconyModule position={[x, y - 1.15, depth / 2 + 0.55]} />
                                )}
                            </React.Fragment>
                        );
                    })}

                    {/* Cornice between floors */}
                    <mesh position={[0, groundFloorHeight + floor * upperFloorHeight, depth / 2 + 0.12]}>
                        <boxGeometry args={[width + 0.15, 0.12, 0.22, 32, 2, 4]} />
                        <meshStandardMaterial color={0xF5F0E8} roughness={0.6} />
                    </mesh>
                </React.Fragment>
            ))}

            {/* PILASTERS at corners */}
            <mesh geometry={pilasterGeo} material={stuccoMat} position={[-width / 2 + 0.15, groundFloorHeight + (totalHeight - groundFloorHeight) / 2, depth / 2 + 0.04]} castShadow />
            <mesh geometry={pilasterGeo} material={stuccoMat} position={[width / 2 - 0.15, groundFloorHeight + (totalHeight - groundFloorHeight) / 2, depth / 2 + 0.04]} castShadow />

            {/* KRANZGESIMS (Crown molding) */}
            <mesh geometry={kranzGeo} material={stuccoMat} position={[-width / 2 - 0.2, totalHeight, -depth / 2 - 0.2]} rotation={[0, Math.PI / 2, 0]} castShadow />

            {/* ROOF */}
            <mesh geometry={roofGeo} material={roofMat} position={[0, totalHeight, -depth / 2 - 0.2]} rotation={[-Math.PI / 2, 0, 0]} castShadow />

            {/* CHIMNEYS */}
            <mesh geometry={chimneyGeo} material={wallMat} position={[-width / 3, totalHeight + 2.8, 0]} castShadow />
            <mesh geometry={chimneyGeo} material={wallMat} position={[width / 3, totalHeight + 2.8, 0]} castShadow />
        </group>
    );
};

export default VienneseBuilding;
