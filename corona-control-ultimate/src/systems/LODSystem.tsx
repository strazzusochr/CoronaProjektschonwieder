/**
 * LODSystem - Automatisches Level-of-Detail Management
 * Gemäß AAA Grafik V4.0 Spezifikation Teil 11
 * 
 * Implementiert:
 * - Automatische LOD-Umschaltung basierend auf Kamera-Distanz
 * - Hysterese für smooth transitions
 * - Billboard-Sprites für sehr weite Distanzen
 */
import React, { useRef, useMemo, useEffect, ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * LOD-Distanzen gemäß V4.0 Spec:
 * - LOD0: 0-20m (Volle Qualität)
 * - LOD1: 20-50m (50% Reduktion)
 * - LOD2: 50-100m (80% Reduktion)
 * - LOD3: 100-200m (Simplifiziert)
 * - Billboard: 200m+ (Sprite)
 */
export interface LODLevel {
    distance: number;      // Ab dieser Distanz wird dieses LOD verwendet
    component: ReactNode;  // Die Komponente für dieses LOD
}

interface LODSystemProps {
    position: [number, number, number];
    levels: LODLevel[];
    children?: ReactNode;  // Fallback/LOD0
    hysteresis?: number;   // Prozent Hysterese (default 10%)
}

/**
 * LODManager - Wrapper-Komponente für automatisches LOD
 */
export const LODManager: React.FC<LODSystemProps> = ({
    position,
    levels,
    children,
    hysteresis = 0.1
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const currentLODRef = useRef<number>(0);
    const { camera } = useThree();

    // Sortiere Levels nach Distanz (aufsteigend)
    const sortedLevels = useMemo(() => {
        return [...levels].sort((a, b) => a.distance - b.distance);
    }, [levels]);

    useFrame(() => {
        if (!groupRef.current) return;

        // Berechne Distanz zur Kamera
        const distance = camera.position.distanceTo(
            new THREE.Vector3(position[0], position[1], position[2])
        );

        // Finde das passende LOD-Level
        let newLOD = 0;
        for (let i = 0; i < sortedLevels.length; i++) {
            const level = sortedLevels[i];
            const hysteresisOffset = currentLODRef.current > i
                ? level.distance * hysteresis
                : -level.distance * hysteresis;

            if (distance >= level.distance + hysteresisOffset) {
                newLOD = i + 1;
            }
        }

        // Update LOD nur wenn sich geändert
        if (newLOD !== currentLODRef.current) {
            currentLODRef.current = newLOD;
        }
    });

    // Render das aktuelle LOD
    const currentLevel = currentLODRef.current;
    const componentToRender = currentLevel === 0
        ? children
        : sortedLevels[currentLevel - 1]?.component || children;

    return (
        <group ref={groupRef} position={position}>
            {componentToRender}
        </group>
    );
};

/**
 * NPCLODWrapper - Spezifischer LOD-Wrapper für NPCs
 * Verwendet unterschiedliche Polygon-Budgets basierend auf Distanz
 */
interface NPCLODProps {
    position: [number, number, number];
    highPolyComponent: ReactNode;  // 35k Poly
    mediumPolyComponent?: ReactNode; // 17.5k Poly
    lowPolyComponent?: ReactNode;   // 6.8k Poly
    billboardComponent?: ReactNode; // Sprite
}

export const NPCLODWrapper: React.FC<NPCLODProps> = ({
    position,
    highPolyComponent,
    mediumPolyComponent,
    lowPolyComponent,
    billboardComponent
}) => {
    const levels: LODLevel[] = [];

    if (mediumPolyComponent) {
        levels.push({ distance: 20, component: mediumPolyComponent });
    }
    if (lowPolyComponent) {
        levels.push({ distance: 50, component: lowPolyComponent });
    }
    if (billboardComponent) {
        levels.push({ distance: 100, component: billboardComponent });
    }

    return (
        <LODManager position={position} levels={levels}>
            {highPolyComponent}
        </LODManager>
    );
};

/**
 * BuildingLODWrapper - Spezifischer LOD-Wrapper für Gebäude
 * Längere Distanzen da Gebäude größer sind
 */
interface BuildingLODProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    highPolyComponent: ReactNode;  // 60k+ Poly
    mediumPolyComponent?: ReactNode; // 30k Poly
    lowPolyComponent?: ReactNode;   // 10k Poly
}

export const BuildingLODWrapper: React.FC<BuildingLODProps> = ({
    position,
    highPolyComponent,
    mediumPolyComponent,
    lowPolyComponent
}) => {
    const levels: LODLevel[] = [];

    if (mediumPolyComponent) {
        levels.push({ distance: 100, component: mediumPolyComponent });
    }
    if (lowPolyComponent) {
        levels.push({ distance: 300, component: lowPolyComponent });
    }

    return (
        <LODManager position={position} levels={levels}>
            {highPolyComponent}
        </LODManager>
    );
};

/**
 * SimpleBillboard - Einfaches Billboard-Sprite für sehr weite Distanzen
 */
interface BillboardProps {
    position?: [number, number, number];
    color?: string;
    scale?: number;
}

export const SimpleBillboard: React.FC<BillboardProps> = ({
    position = [0, 0, 0],
    color = '#FFFFFF',
    scale = 1
}) => {
    const spriteRef = useRef<THREE.Sprite>(null);

    return (
        <sprite ref={spriteRef} position={position} scale={[scale, scale * 2, 1]}>
            <spriteMaterial color={color} opacity={0.8} transparent />
        </sprite>
    );
};

export default LODManager;
