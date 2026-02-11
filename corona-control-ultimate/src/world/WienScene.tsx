import React from 'react';
import * as THREE from 'three';
import { createAsphaltTexture } from '@/utils/ProceduralTextures';

/**
 * V7.0 WIEN WORLD GENERATOR (Scene Components)
 * Prozedurale Stadtszene: Stephansplatz & Umgebung
 */

export const StephansplatzGround = (): React.ReactElement => {
    const texture = React.useMemo(() => {
        const tex = createAsphaltTexture();
        tex.repeat.set(40, 40);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }, []);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial
                map={texture}
                roughness={0.9}
                metalness={0.1}
            />
        </mesh>
    );
};

/** Einfacher Gebäude-Stock als Box-Geometrie */
const BuildingFloorSimple = ({ segments = 8, height = 3.5 }: { segments?: number; height?: number }) => (
    <mesh castShadow receiveShadow>
        <boxGeometry args={[segments * 1.2, height, 10]} />
        <meshStandardMaterial color="#C8B896" roughness={0.85} />
    </mesh>
);

export const StephansplatzWorld = (): React.ReactElement => {
    return (
        <group name="Stephansplatz">
            <StephansplatzGround />

            {/* Gebäude-Block A: Kärntner Straße Ecke */}
            <group position={[-50, 0, -30]}>
                {[0, 3.5, 7, 10.5].map(h => (
                    <group key={h} position={[0, h, 0]}>
                        <BuildingFloorSimple segments={12} height={3.5} />
                    </group>
                ))}
            </group>

            {/* Gebäude-Block B: Graben Ecke */}
            <group position={[30, 0, -40]} rotation={[0, -Math.PI / 6, 0]}>
                {[0, 3.5, 7].map(h => (
                    <group key={h} position={[0, h, 0]}>
                        <BuildingFloorSimple segments={8} height={4} />
                    </group>
                ))}
            </group>

            {/* Wasserwerfer-Stationierung (Placeholder) */}
            <group position={[10, 0, 20]}>
                <mesh position={[0, 0.6, 0]} castShadow>
                    <boxGeometry args={[3, 1.8, 6]} />
                    <meshStandardMaterial color="#003366" metalness={0.4} roughness={0.6} />
                </mesh>
            </group>

            {/* Dynamische Props: Barrikaden Placeholder */}
            <group position={[-10, 0, 5]}>
                <mesh castShadow>
                    <boxGeometry args={[4, 1.5, 0.5]} />
                    <meshStandardMaterial color="#333333" />
                </mesh>
            </group>
        </group>
    );
};
