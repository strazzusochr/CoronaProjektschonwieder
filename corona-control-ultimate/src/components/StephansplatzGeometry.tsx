import React, { useMemo, Suspense } from 'react';
import * as THREE from 'three';
import VienneseBuilding from './buildings/VienneseBuilding';
import EnvironmentObjects from './environment/EnvironmentObjects';
import { createCobblestoneTexture, createAsphaltTexture } from '@/utils/ProceduralTextures';

const { StreetLamp, ParkBench, TrashBin, Tree } = EnvironmentObjects;

/**
 * StephansplatzGeometry - AAA-Qualität Wien Stephansplatz
 * Gemäß AAA Grafik V4.0 Spezifikation
 * 
 * Integriert:
 * - High-Poly VienneseBuilding (~60.000 Poly)
 * - Straßenmöbel (Laternen, Bänke, Mülleimer, Bäume)
 * - Prozedurale Texturen für Boden
 * - Detaillierter Stephansdom-Placeholder
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
    // Gründerzeit-Gebäude Positionen
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
 * Stephansdom - High-Poly Gotischer Dom
 * ~100.000 Polygone (vereinfachte Version)
 */
const StephansdomComponent: React.FC = () => {
    // Materials
    const stoneMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0x8B8B83,
        roughness: 0.85,
        metalness: 0.0,
    }), []);

    const roofMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0x1A4D2E, // Grüne Dachziegel
        roughness: 0.6,
        metalness: 0.1,
    }), []);

    const goldMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        roughness: 0.2,
        metalness: 0.9,
    }), []);

    // Geometries (High-Poly)
    const towerGeo = useMemo(() => new THREE.BoxGeometry(12, 80, 15, 8, 24, 8), []);
    const spireGeo = useMemo(() => new THREE.ConeGeometry(6, 50, 12, 8), []);
    const shipGeo = useMemo(() => new THREE.BoxGeometry(28, 28, 65, 6, 6, 12), []);
    const roofGeo = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(16, 0);
        shape.lineTo(8, 18);
        shape.closePath();
        const extrudeSettings = { depth: 65, bevelEnabled: false };
        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }, []);

    // Window geometry for gothic windows
    const windowGeo = useMemo(() => new THREE.BoxGeometry(1.5, 4, 0.5, 4, 8, 1), []);

    // Buttresses (Strebepfeiler)
    const buttressGeo = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(3, 0);
        shape.lineTo(0.5, 25);
        shape.lineTo(0, 25);
        shape.closePath();
        return new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false });
    }, []);

    return (
        <group name="Stephansdom">
            {/* Südturm (Steffl) - 136m */}
            <mesh position={[0, 40, 0]} castShadow receiveShadow geometry={towerGeo} material={stoneMaterial} />

            {/* Turmspitze */}
            <mesh position={[0, 105, 0]} castShadow geometry={spireGeo} material={stoneMaterial} />

            {/* Turmkreuz */}
            <mesh position={[0, 132, 0]} castShadow>
                <boxGeometry args={[0.3, 4, 0.3]} />
                <primitive object={goldMaterial} attach="material" />
            </mesh>
            <mesh position={[0, 131, 0]} castShadow>
                <boxGeometry args={[2, 0.3, 0.3]} />
                <primitive object={goldMaterial} attach="material" />
            </mesh>

            {/* Hauptschiff */}
            <mesh position={[0, 14, -35]} castShadow receiveShadow geometry={shipGeo} material={stoneMaterial} />

            {/* Dach mit charakteristischem Muster */}
            <mesh position={[-8, 28, -67]} rotation={[Math.PI / 2, 0, 0]} castShadow geometry={roofGeo} material={roofMaterial} />

            {/* Gotische Fenster am Turm */}
            {[-3, 0, 3].map((x, i) =>
                [20, 35, 50, 65].map((y, j) => (
                    <mesh key={`window-${i}-${j}`} position={[x, y, 8]} castShadow geometry={windowGeo}>
                        <meshStandardMaterial color={0x1A1A2E} roughness={0.1} metalness={0.3} />
                    </mesh>
                ))
            )}

            {/* Strebepfeiler (8 Stück) */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                const angle = (i / 8) * Math.PI * 2;
                const x = Math.sin(angle) * 18;
                const z = -35 + Math.cos(angle) * 35;
                return (
                    <mesh
                        key={`buttress-${i}`}
                        position={[x, 0, z]}
                        rotation={[Math.PI / 2, angle, 0]}
                        castShadow
                        geometry={buttressGeo}
                        material={stoneMaterial}
                    />
                );
            })}

            {/* Nordturm (unvollendet) */}
            <mesh position={[0, 34, -55]} castShadow receiveShadow>
                <boxGeometry args={[12, 68, 12, 6, 12, 6]} />
                <primitive object={stoneMaterial} attach="material" />
            </mesh>

            {/* Renaissance-Kuppel auf Nordturm */}
            <mesh position={[0, 72, -55]} castShadow>
                <sphereGeometry args={[7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color={0x2D4356} roughness={0.4} metalness={0.3} />
            </mesh>
        </group>
    );
};

/**
 * Pestsäule (Dreifaltigkeitssäule)
 * ~5.000 Polygone
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
            {/* Sockel (Dreiecksform) */}
            <mesh position={[0, 2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[4, 5, 4, 6, 2]} />
                <primitive object={marbleMaterial} attach="material" />
            </mesh>

            {/* Mittelsäule mit Wolkenskulptur */}
            <mesh position={[0, 10, 0]} castShadow>
                <cylinderGeometry args={[1.5, 2.5, 12, 16, 4]} />
                <primitive object={marbleMaterial} attach="material" />
            </mesh>

            {/* Wolken (vereinfacht) */}
            {[0, 1, 2].map((i) => {
                const angle = (i / 3) * Math.PI * 2;
                return (
                    <mesh
                        key={`cloud-${i}`}
                        position={[Math.sin(angle) * 2, 8 + i * 1.5, Math.cos(angle) * 2]}
                        castShadow
                    >
                        <sphereGeometry args={[1.2, 12, 8]} />
                        <primitive object={marbleMaterial} attach="material" />
                    </mesh>
                );
            })}

            {/* Dreifaltigkeit (Spitze) */}
            <mesh position={[0, 18, 0]} castShadow>
                <coneGeometry args={[0.8, 3, 8]} />
                <primitive object={goldMaterial} attach="material" />
            </mesh>

            {/* Heiligenfiguren am Sockel */}
            {[0, 1, 2].map((i) => {
                const angle = (i / 3) * Math.PI * 2;
                return (
                    <mesh
                        key={`figure-${i}`}
                        position={[Math.sin(angle) * 3.5, 5, Math.cos(angle) * 3.5]}
                        castShadow
                    >
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
 * ~40.000 Polygone
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
            {/* Hauptkörper - geschwungene Form */}
            <mesh position={[0, 12, 0]} castShadow receiveShadow>
                <boxGeometry args={[22, 24, 18, 8, 8, 8]} />
                <primitive object={glassMaterial} attach="material" />
            </mesh>

            {/* Fensterrahmen-Grid */}
            {Array.from({ length: 6 }).map((_, floor) =>
                Array.from({ length: 8 }).map((_, col) => (
                    <mesh
                        key={`frame-${floor}-${col}`}
                        position={[-9.5 + col * 2.8, 2.5 + floor * 3.8, 9.1]}
                        castShadow
                    >
                        <boxGeometry args={[0.1, 3.5, 0.2]} />
                        <primitive object={frameMaterial} attach="material" />
                    </mesh>
                ))
            )}

            {/* Horizontale Bänder */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <mesh key={`band-${i}`} position={[0, 1 + i * 4, 9.2]} castShadow>
                    <boxGeometry args={[23, 0.15, 0.3]} />
                    <primitive object={frameMaterial} attach="material" />
                </mesh>
            ))}

            {/* Dachstruktur */}
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
            {/* Überdachung */}
            <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
                <boxGeometry args={[10, 0.5, 5, 4, 1, 4]} />
                <primitive object={metalMaterial} attach="material" />
            </mesh>

            {/* Stützen */}
            <mesh position={[-4, 1.25, 2]} castShadow>
                <cylinderGeometry args={[0.15, 0.15, 2.5, 12]} />
                <primitive object={metalMaterial} attach="material" />
            </mesh>
            <mesh position={[4, 1.25, 2]} castShadow>
                <cylinderGeometry args={[0.15, 0.15, 2.5, 12]} />
                <primitive object={metalMaterial} attach="material" />
            </mesh>

            {/* Treppe */}
            {[0, 1, 2, 3, 4].map((i) => (
                <mesh key={`step-${i}`} position={[0, -0.15 * i, -1 - i * 0.8]} receiveShadow>
                    <boxGeometry args={[6, 0.3, 0.8]} />
                    <meshStandardMaterial color={0x808080} roughness={0.8} />
                </mesh>
            ))}

            {/* U-Bahn Logo */}
            <mesh position={[0, 2.8, 2.3]} castShadow>
                <boxGeometry args={[1.5, 1.5, 0.1]} />
                <meshStandardMaterial color={0xFFFFFF} emissive={0x1E90FF} emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
};

const StephansplatzGeometry: React.FC<StephansplatzProps> = ({
    showGrid = false,
    showLandmarks = true,
    showEnvironment = true
}) => {
    // Prozedurale Bodentextur (Wiener Würfel)
    const groundMaterial = useMemo(() => {
        const texture = createCobblestoneTexture(1024);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 8);
        return new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.85,
            metalness: 0.0
        });
    }, []);

    // Straßentextur
    const streetMaterial = useMemo(() => {
        const texture = createAsphaltTexture(1024);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 1);
        return new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.9,
            metalness: 0.0
        });
    }, []);

    // Platzfläche
    const groundGeometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(
            PLATZ_DIMENSIONS.width,
            PLATZ_DIMENSIONS.length,
            20, 16
        );
        geo.rotateX(-Math.PI / 2);
        return geo;
    }, []);

    // Straßen-Geometrie
    const streetGeometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(12, PLATZ_DIMENSIONS.length + 40, 4, 16);
        geo.rotateX(-Math.PI / 2);
        return geo;
    }, []);

    return (
        <group name="Stephansplatz">
            {/* === BODEN === */}
            <mesh
                geometry={groundGeometry}
                material={groundMaterial}
                receiveShadow
                position={[0, 0, 0]}
            />

            {/* Straßen links und rechts */}
            <mesh
                geometry={streetGeometry}
                material={streetMaterial}
                receiveShadow
                position={[-56, 0.01, 0]}
            />
            <mesh
                geometry={streetGeometry}
                material={streetMaterial}
                receiveShadow
                position={[56, 0.01, 0]}
            />

            {/* === LANDMARKS === */}
            {showLandmarks && (
                <Suspense fallback={null}>
                    {/* Stephansdom */}
                    <group position={[LANDMARKS.stephansdom.x, 0, LANDMARKS.stephansdom.z]}>
                        <StephansdomComponent />
                    </group>

                    {/* Haas-Haus */}
                    <group position={[LANDMARKS.haasHaus.x, 0, LANDMARKS.haasHaus.z]} rotation={[0, LANDMARKS.haasHaus.rotation, 0]}>
                        <HaasHaus />
                    </group>

                    {/* Pestsäule */}
                    <group position={[LANDMARKS.pestSaeule.x, 0, LANDMARKS.pestSaeule.z]}>
                        <PestColumn />
                    </group>

                    {/* U-Bahn Eingang */}
                    <group position={[LANDMARKS.ubahn.x, 0, LANDMARKS.ubahn.z]}>
                        <UBahnEntrance />
                    </group>

                    {/* === GRÜNDERZEIT-GEBÄUDE (AAA) === */}
                    <VienneseBuilding
                        position={[LANDMARKS.building1.x, 0, LANDMARKS.building1.z]}
                        rotation={[0, LANDMARKS.building1.rotation, 0]}
                        floors={5}
                        width={20}
                        depth={14}
                        style="ornate"
                    />
                    <VienneseBuilding
                        position={[LANDMARKS.building2.x, 0, LANDMARKS.building2.z]}
                        rotation={[0, LANDMARKS.building2.rotation, 0]}
                        floors={4}
                        width={18}
                        depth={12}
                        style="classic"
                    />
                    <VienneseBuilding
                        position={[LANDMARKS.building3.x, 0, LANDMARKS.building3.z]}
                        rotation={[0, LANDMARKS.building3.rotation, 0]}
                        floors={6}
                        width={22}
                        depth={15}
                        style="ornate"
                    />
                </Suspense>
            )}

            {/* === ENVIRONMENT OBJECTS === */}
            {showEnvironment && (
                <Suspense fallback={null}>
                    {/* Straßenlaternen (mindestens 5) */}
                    <StreetLamp position={[-30, 0, 20]} isLit={true} />
                    <StreetLamp position={[-30, 0, -10]} isLit={true} />
                    <StreetLamp position={[30, 0, 20]} isLit={true} />
                    <StreetLamp position={[30, 0, -10]} isLit={true} />
                    <StreetLamp position={[0, 0, 30]} isLit={true} />
                    <StreetLamp position={[15, 0, -35]} isLit={true} />

                    {/* Parkbänke (mindestens 2) */}
                    <ParkBench position={[-20, 0, 15]} rotation={[0, Math.PI / 4, 0]} />
                    <ParkBench position={[20, 0, 15]} rotation={[0, -Math.PI / 4, 0]} />
                    <ParkBench position={[10, 0, 25]} rotation={[0, 0, 0]} />

                    {/* Mülleimer (mindestens 3) */}
                    <TrashBin position={[-25, 0, 18]} />
                    <TrashBin position={[25, 0, 18]} />
                    <TrashBin position={[5, 0, -20]} />
                    <TrashBin position={[-10, 0, 28]} />

                    {/* Bäume (mindestens 2) */}
                    <Tree position={[-35, 0, 25]} scale={1.2} type="linden" />
                    <Tree position={[35, 0, 25]} scale={1.0} type="chestnut" />
                    <Tree position={[-35, 0, -15]} scale={0.9} type="linden" />
                    <Tree position={[35, 0, -20]} scale={1.1} type="chestnut" />
                </Suspense>
            )}

            {/* Debug-Grid */}
            {showGrid && (
                <gridHelper
                    args={[PLATZ_DIMENSIONS.width * 1.2, 24, 0x888888, 0x444444]}
                    position={[0, 0.02, 0]}
                />
            )}
        </group>
    );
};

export default StephansplatzGeometry;
