import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * StephansplatzGeometry - Wien Stephansplatz Basisgeometrie
 * 
 * Basierend auf 00_MASTER_START_PROMPT_ULTRA_EXPANDED.md:
 * - GPS-Koordinaten: 48.208493° N, 16.373118° E
 * - Elevation: 171m über Meeresspiegel
 * - Fläche: ~100m x 80m (8.000m²)
 * - Pflastersteine: 305.000 (Fischgrät-Muster)
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
    stephansdom: { x: 0, z: -10, rotation: 0 },
    haasHaus: { x: 40, z: 20, rotation: Math.PI / 4 },
    pestSaeule: { x: -15, z: 5 },
    ubahn: { x: 25, z: -30 }
};

interface StephansplatzProps {
    showGrid?: boolean;
    showLandmarks?: boolean;
}

const StephansplatzGeometry: React.FC<StephansplatzProps> = ({ 
    showGrid = true, 
    showLandmarks = true 
}) => {
    // Pflasterstein-Textur (simplified für Performance)
    const groundMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: 0x8B7355, // Sandstein-Farbe
            roughness: 0.9,
            metalness: 0.0
        });
    }, []);

    // Platzfläche
    const groundGeometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(
            PLATZ_DIMENSIONS.width, 
            PLATZ_DIMENSIONS.length, 
            10, 10
        );
        geo.rotateX(-Math.PI / 2);
        return geo;
    }, []);

    return (
        <group name="Stephansplatz">
            {/* Hauptfläche */}
            <mesh 
                geometry={groundGeometry} 
                material={groundMaterial}
                receiveShadow
                position={[0, 0, 0]}
            />

            {/* Stephansdom Placeholder */}
            {showLandmarks && (
                <group position={[LANDMARKS.stephansdom.x, 0, LANDMARKS.stephansdom.z]}>
                    {/* Südturm (136.44m hoch) - vereinfacht */}
                    <mesh position={[0, 34, 0]} castShadow>
                        <boxGeometry args={[15, 68, 20]} />
                        <meshStandardMaterial color={0x8B8B83} />
                    </mesh>
                    {/* Turmspitze */}
                    <mesh position={[0, 78, 0]} castShadow>
                        <coneGeometry args={[7, 40, 8]} />
                        <meshStandardMaterial color={0x696969} />
                    </mesh>
                    {/* Hauptschiff */}
                    <mesh position={[0, 15, -25]} castShadow>
                        <boxGeometry args={[30, 30, 70]} />
                        <meshStandardMaterial color={0x8B8B83} />
                    </mesh>
                </group>
            )}

            {/* Haas-Haus Placeholder (Glasgebäude) */}
            {showLandmarks && (
                <mesh 
                    position={[LANDMARKS.haasHaus.x, 12, LANDMARKS.haasHaus.z]}
                    castShadow
                >
                    <boxGeometry args={[25, 24, 20]} />
                    <meshStandardMaterial 
                        color={0x4A90D9} 
                        metalness={0.9}
                        roughness={0.1}
                        transparent
                        opacity={0.7}
                    />
                </mesh>
            )}

            {/* Pestsäule (Dreifaltigkeitssäule) */}
            {showLandmarks && (
                <group position={[LANDMARKS.pestSaeule.x, 0, LANDMARKS.pestSaeule.z]}>
                    <mesh position={[0, 4, 0]} castShadow>
                        <boxGeometry args={[3, 8, 3]} />
                        <meshStandardMaterial color={0xD4C4A8} />
                    </mesh>
                    <mesh position={[0, 10, 0]} castShadow>
                        <cylinderGeometry args={[0.5, 1, 4, 8]} />
                        <meshStandardMaterial color={0xFFD700} />
                    </mesh>
                </group>
            )}

            {/* U-Bahn Eingang */}
            {showLandmarks && (
                <mesh 
                    position={[LANDMARKS.ubahn.x, 1, LANDMARKS.ubahn.z]}
                >
                    <boxGeometry args={[8, 2, 4]} />
                    <meshStandardMaterial color={0x1E90FF} />
                </mesh>
            )}

            {/* Debug-Grid */}
            {showGrid && (
                <gridHelper 
                    args={[PLATZ_DIMENSIONS.width, 20, 0x888888, 0x444444]} 
                    position={[0, 0.01, 0]}
                />
            )}
        </group>
    );
};

export default StephansplatzGeometry;
