import React, { useMemo, Suspense } from 'react';
import * as THREE from 'three';
import VienneseBuilding from './buildings/VienneseBuilding';
import Stephansdom from './buildings/Stephansdom';
import { createCobblestoneTexture, createAsphaltTexture } from '@/utils/ProceduralTextures';
import {
    InstancedStreetLamps,
    InstancedTrees,
    InstancedTrashBins,
    InstancedParkBenches
} from './environment/InstancedObjects';

/**
 * StephansplatzGeometry - AAA-Qualität Wien Stephansplatz
 * Gemäß AAA Grafik V4.0 Spezifikation
 */

// GPS-Referenzpunkt (Mitte des Stephansplatzes)
export const STEPHANSPLATZ_GPS = {
    lat: 48.208493,
    lng: 16.373118,
    elevation: 171
};

// Platz-Dimensionen in Metern
export const PLATZ_DIMENSIONS = {
    width: 100,  // Ost-West
    length: 80,  // Nord-Süd
    area: 8000   // m²
};

// Gebäude-Positionen relativ zum Platzmittelpunkt
export const LANDMARKS = {
    stephansdom: { x: 0, z: -25, rotation: 0 },
    haasHaus: { x: 45, z: 25, rotation: Math.PI / 4 },
    pestSaeule: { x: -15, z: 5 },
    ubahn: { x: 25, z: -30 },
    building1: { x: -45, z: 10, rotation: Math.PI / 2 },
    building2: { x: -45, z: -20, rotation: Math.PI / 2 },
    building3: { x: 50, z: -15, rotation: -Math.PI / 2 },
};

interface StephansplatzProps {
    showGrid?: boolean;
    showLandmarks?: boolean;
    showEnvironment?: boolean;
}

/**
 * Pestsäule (Dreifaltigkeitssäule)
 */
const PestColumn: React.FC = () => {
    const marbleMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0xE8E0D0,
        roughness: 0.3,
        metalness: 0.0,
    }), []);

    const goldMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        roughness: 0.2,
        metalness: 0.9,
    }), []);

    return (
        <group name="Pestsäule">
            <mesh position={[0, 2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[4, 5, 4, 6, 2]} />
                <primitive object={marbleMaterial} attach="material" />
            </mesh>
            <mesh position={[0, 10, 0]} castShadow>
                <cylinderGeometry args={[1.5, 2.5, 12, 16, 4]} />
                <primitive object={marbleMaterial} attach="material" />
            </mesh>
            {[0, 1, 2].map((i) => {
                const angle = (i / 3) * Math.PI * 2;
                return (
                    <mesh key={`cloud-${i}`} position={[Math.sin(angle) * 2, 8 + i * 1.5, Math.cos(angle) * 2]} castShadow>
                        <sphereGeometry args={[1.2, 12, 8]} />
                        <primitive object={marbleMaterial} attach="material" />
                    </mesh>
                );
            })}
            <mesh position={[0, 18, 0]} castShadow>
                <coneGeometry args={[0.8, 3, 8]} />
                <primitive object={goldMaterial} attach="material" />
            </mesh>
            {[0, 1, 2].map((i) => {
                const angle = (i / 3) * Math.PI * 2;
                return (
                    <mesh key={`figure-${i}`} position={[Math.sin(angle) * 3.5, 5, Math.cos(angle) * 3.5]} castShadow>
                        <capsuleGeometry args={[0.3, 1.2, 8, 12]} />
                        <primitive object={marbleMaterial} attach="material" />
                    </mesh>
                );
            })}
        </group>
    );
};

/**
 * Haas-Haus (Postmodernes Glasgebäude)
 */
const HaasHaus: React.FC = () => {
    const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: 0x88AACC,
        transmission: 0.6,
        roughness: 0.05,
        metalness: 0.1,
        ior: 1.5,
        thickness: 0.5,
    }), []);

    const frameMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0x404040,
        roughness: 0.3,
        metalness: 0.8,
    }), []);

    return (
        <group name="HaasHaus">
            <mesh position={[0, 12, 0]} castShadow receiveShadow>
                <boxGeometry args={[22, 24, 18, 8, 8, 8]} />
                <primitive object={glassMaterial} attach="material" />
            </mesh>
            {Array.from({ length: 6 }).map((_, floor) =>
                Array.from({ length: 8 }).map((_, col) => (
                    <mesh key={`frame-${floor}-${col}`} position={[-9.5 + col * 2.8, 2.5 + floor * 3.8, 9.1]} castShadow>
                        <boxGeometry args={[0.1, 3.5, 0.2]} />
                        <primitive object={frameMaterial} attach="material" />
                    </mesh>
                ))
            )}
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <mesh key={`band-${i}`} position={[0, 1 + i * 4, 9.2]} castShadow>
                    <boxGeometry args={[23, 0.15, 0.3]} />
                    <primitive object={frameMaterial} attach="material" />
                </mesh>
            ))}
            <mesh position={[0, 24.5, 0]} castShadow>
                <boxGeometry args={[24, 1, 20]} />
                <primitive object={frameMaterial} attach="material" />
            </mesh>
        </group>
    );
};

/**
 * U-Bahn Eingang
 */
const UBahnEntrance: React.FC = () => {
    const metalMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0x1E90FF,
        roughness: 0.4,
        metalness: 0.7,
    }), []);

    return (
        <group name="UBahnEingang">
            <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
                <boxGeometry args={[10, 0.5, 5, 4, 1, 4]} />
                <primitive object={metalMaterial} attach="material" />
            </mesh>
            <mesh position={[-4, 1.25, 2]} castShadow>
                <cylinderGeometry args={[0.15, 0.15, 2.5, 12]} />
                <primitive object={metalMaterial} attach="material" />
            </mesh>
            <mesh position={[4, 1.25, 2]} castShadow>
                <cylinderGeometry args={[0.15, 0.15, 2.5, 12]} />
                <primitive object={metalMaterial} attach="material" />
            </mesh>
            {[0, 1, 2, 3, 4].map((i) => (
                <mesh key={`step-${i}`} position={[0, -0.15 * i, -1 - i * 0.8]} receiveShadow>
                    <boxGeometry args={[6, 0.3, 0.8]} />
                    <meshStandardMaterial color={0x808080} roughness={0.8} />
                </mesh>
            ))}
            <mesh position={[0, 2.8, 2.3]} castShadow>
                <boxGeometry args={[1.5, 1.5, 0.1]} />
                <meshStandardMaterial color={0xFFFFFF} emissive={0x1E90FF} emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
};

// Environment Positions
const LAMP_POSITIONS: any[] = [
    { position: [-30, 0, 20] },
    { position: [-30, 0, -10] },
    { position: [30, 0, 20] },
    { position: [30, 0, -10] },
    { position: [0, 0, 30] },
    { position: [15, 0, -35] },
];

const BENCH_POSITIONS: any[] = [
    { position: [-20, 0, 15], rotation: [0, Math.PI / 4, 0] },
    { position: [20, 0, 15], rotation: [0, -Math.PI / 4, 0] },
    { position: [10, 0, 25], rotation: [0, 0, 0] },
];

const BIN_POSITIONS: any[] = [
    { position: [-25, 0, 18] },
    { position: [25, 0, 18] },
    { position: [5, 0, -20] },
    { position: [-10, 0, 28] },
];

const TREE_POSITIONS: any[] = [
    { position: [-35, 0, 25], scale: 1.2 },
    { position: [35, 0, 25], scale: 1.0 },
    { position: [-35, 0, -15], scale: 0.9 },
    { position: [35, 0, -20], scale: 1.1 },
];

const StephansplatzGeometry: React.FC<StephansplatzProps> = ({
    showGrid = false,
    showLandmarks = true,
    showEnvironment = true
}) => {
    const groundMaterial = useMemo(() => {
        const texture = createCobblestoneTexture(1024);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 8);
        return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, metalness: 0.0 });
    }, []);

    const streetMaterial = useMemo(() => {
        const texture = createAsphaltTexture(1024);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 1);
        return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0.0 });
    }, []);

    const groundGeometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(PLATZ_DIMENSIONS.width, PLATZ_DIMENSIONS.length, 20, 16);
        geo.rotateX(-Math.PI / 2);
        return geo;
    }, []);

    const streetGeometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(12, PLATZ_DIMENSIONS.length + 40, 4, 16);
        geo.rotateX(-Math.PI / 2);
        return geo;
    }, []);

    return (
        <group name="Stephansplatz">
            <mesh geometry={groundGeometry} material={groundMaterial} receiveShadow position={[0, 0, 0]} />
            <mesh geometry={streetGeometry} material={streetMaterial} receiveShadow position={[-56, 0.01, 0]} />
            <mesh geometry={streetGeometry} material={streetMaterial} receiveShadow position={[56, 0.01, 0]} />

            {showLandmarks && (
                <Suspense fallback={null}>
                    <group position={[LANDMARKS.stephansdom.x, 0, LANDMARKS.stephansdom.z]}>
                        <Stephansdom />
                    </group>
                    <group position={[LANDMARKS.haasHaus.x, 0, LANDMARKS.haasHaus.z]} rotation={[0, LANDMARKS.haasHaus.rotation, 0]}>
                        <HaasHaus />
                    </group>
                    <group position={[LANDMARKS.pestSaeule.x, 0, LANDMARKS.pestSaeule.z]}>
                        <PestColumn />
                    </group>
                    <group position={[LANDMARKS.ubahn.x, 0, LANDMARKS.ubahn.z]}>
                        <UBahnEntrance />
                    </group>

                    <VienneseBuilding
                        position={[LANDMARKS.building1.x, 0, LANDMARKS.building1.z]}
                        rotation={[0, LANDMARKS.building1.rotation, 0]}
                        floors={5} width={20} depth={14} style="ornate"
                    />
                    <VienneseBuilding
                        position={[LANDMARKS.building2.x, 0, LANDMARKS.building2.z]}
                        rotation={[0, LANDMARKS.building2.rotation, 0]}
                        floors={4} width={18} depth={12} style="rustika"
                    />
                    <VienneseBuilding
                        position={[LANDMARKS.building3.x, 0, LANDMARKS.building3.z]}
                        rotation={[0, LANDMARKS.building3.rotation, 0]}
                        floors={6} width={22} depth={15} style="corner"
                    />
                </Suspense>
            )}

            {showEnvironment && (
                <Suspense fallback={null}>
                    <InstancedStreetLamps positions={LAMP_POSITIONS} />
                    <InstancedParkBenches positions={BENCH_POSITIONS} />
                    <InstancedTrashBins positions={BIN_POSITIONS} />
                    <InstancedTrees positions={TREE_POSITIONS} />
                </Suspense>
            )}

            {showGrid && (
                <gridHelper args={[PLATZ_DIMENSIONS.width * 1.2, 24, 0x888888, 0x444444]} position={[0, 0.02, 0]} />
            )}
        </group>
    );
};

export default StephansplatzGeometry;
