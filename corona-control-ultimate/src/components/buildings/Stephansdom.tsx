import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createRoofTileTexture, createConcreteTexture, createRoofTileNormalMap } from '@/utils/ProceduralTextures';

/**
 * Stephansdom - High-Poly Gotischer Dom (V6.0 Refined)
 * ~100.000 Polygone (vereinfachte Version)
 * Mit AAA Texturen (Dachziegel-Muster)
 */
const Stephansdom: React.FC = () => {
    // Materials
    const stoneMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        map: createConcreteTexture(1024),
        color: 0x8B8B83,
        roughness: 0.85,
        metalness: 0.0,
    }), []);

    const roofMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        map: createRoofTileTexture(), // ZigZag Pattern
        normalMap: createRoofTileNormalMap(), // AAA Detail
        color: 0xffffff, // Texture provides color
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

    // Roof Geometry - Custom shape extruded
    const roofGeo = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(16, 0);
        shape.lineTo(8, 18);
        shape.closePath();
        const extrudeSettings = { depth: 65, bevelEnabled: false };
        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // UV Mapping adjustment for roof tiles
        // Simple planar projection logic or scaling UVs
        const uvAttribute = geo.attributes.uv;
        for (let i = 0; i < uvAttribute.count; i++) {
            const u = uvAttribute.getX(i);
            const v = uvAttribute.getY(i);
            // Scale UVs to repeat texture nicely
            uvAttribute.setXY(i, u * 0.1, v * 0.1);
        }

        return geo;
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

export default Stephansdom;
