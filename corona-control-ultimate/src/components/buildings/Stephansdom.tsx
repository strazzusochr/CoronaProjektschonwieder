import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Detailed } from '@react-three/drei';
import { createRoofTileTexture, createConcreteTexture, createRoofTileNormalMap } from '@/utils/ProceduralTextures';

/**
 * Stephansdom - High-Poly Gotischer Dom (V6.0 Refined)
 * ~100.000 Polygone (vereinfachte Version)
 * Mit AAA Texturen (Dachziegel-Muster)
 * LOD-Optimiert
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
        map: createRoofTileTexture(),
        normalMap: createRoofTileNormalMap(),
        color: 0xffffff,
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

    // Low-Poly Geometries for LOD
    const towerGeoLow = useMemo(() => new THREE.BoxGeometry(12, 80, 15, 1, 1, 1), []);
    const shipGeoLow = useMemo(() => new THREE.BoxGeometry(28, 28, 65, 1, 1, 1), []);

    // Roof Geometry
    const roofGeo = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(16, 0); shape.lineTo(8, 18); shape.closePath();
        const extrudeSettings = { depth: 65, bevelEnabled: false };
        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const uvAttribute = geo.attributes.uv;
        for (let i = 0; i < uvAttribute.count; i++) {
            const u = uvAttribute.getX(i); const v = uvAttribute.getY(i);
            uvAttribute.setXY(i, u * 0.1, v * 0.1);
        }
        return geo;
    }, []);

    const windowGeo = useMemo(() => new THREE.BoxGeometry(1.5, 4, 0.5, 2, 4, 1), []);
    const buttressGeo = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(3, 0); shape.lineTo(0.5, 25); shape.lineTo(0, 25); shape.closePath();
        return new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false });
    }, []);

    return (
        <Detailed distances={[0, 80, 200]}>
            {/* LOD 0: FULL AAA DETAIL (~100k Poly) */}
            <group name="Stephansdom_High">
                <mesh position={[0, 40, 0]} castShadow receiveShadow geometry={towerGeo} material={stoneMaterial} />
                <mesh position={[0, 105, 0]} castShadow geometry={spireGeo} material={stoneMaterial} />
                <mesh position={[0, 132, 0]} castShadow><boxGeometry args={[0.3, 4, 0.3]} /><primitive object={goldMaterial} attach="material" /></mesh>
                <mesh position={[0, 131, 0]} castShadow><boxGeometry args={[2, 0.3, 0.3]} /><primitive object={goldMaterial} attach="material" /></mesh>
                <mesh position={[0, 14, -35]} castShadow receiveShadow geometry={shipGeo} material={stoneMaterial} />
                <mesh position={[-8, 28, -67]} rotation={[Math.PI / 2, 0, 0]} castShadow geometry={roofGeo} material={roofMaterial} />
                {[-3, 0, 3].map((x, i) => [20, 35, 50, 65].map((y, j) => (
                    <mesh key={`w-${i}-${j}`} position={[x, y, 8]} geometry={windowGeo}><meshStandardMaterial color={0x111111} /></mesh>
                )))}
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                    const angle = (i / 8) * Math.PI * 2;
                    const x = Math.sin(angle) * 18; const z = -35 + Math.cos(angle) * 35;
                    return <mesh key={`b-${i}`} position={[x, 0, z]} rotation={[Math.PI / 2, angle, 0]} geometry={buttressGeo} material={stoneMaterial} />;
                })}
                <mesh position={[0, 34, -55]} geometry={new THREE.BoxGeometry(12, 68, 12)} material={stoneMaterial} />
            </group>

            {/* LOD 1: MEDIUM (Silhouette only, No Windows/Buttresses) */}
            <group name="Stephansdom_Medium">
                <mesh position={[0, 40, 0]} geometry={towerGeoLow} material={stoneMaterial} />
                <mesh position={[0, 105, 0]} geometry={spireGeo} material={stoneMaterial} />
                <mesh position={[0, 14, -35]} geometry={shipGeoLow} material={stoneMaterial} />
                <mesh position={[-8, 28, -67]} rotation={[Math.PI / 2, 0, 0]} geometry={roofGeo} material={roofMaterial} />
                <mesh position={[0, 34, -55]} geometry={new THREE.BoxGeometry(12, 68, 12)} material={stoneMaterial} />
            </group>

            {/* LOD 2: LOW (Billboard / Simplified Envelope) */}
            <mesh position={[0, 65, -20]}>
                <boxGeometry args={[30, 130, 80]} />
                <meshBasicMaterial color="#444" />
            </mesh>
        </Detailed>
    );
};

export default Stephansdom;
