/**
 * InstancedObjects - Performance-optimierte Objekt-Instanzierung
 * Gemäß AAA Grafik V4.0 Spezifikation Teil 12
 * 
 * Verwendet InstancedMesh für identische Objekte:
 * - Straßenlaternen
 * - Bäume
 * - Mülleimer
 * - Poller
 */
import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createMetalTexture, createWoodTexture } from '@/utils/ProceduralTextures';

interface InstancePosition {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
}

interface InstancedLampsProps {
    positions: InstancePosition[];
    isNight?: boolean;
}

/**
 * InstancedStreetLamps - Viele Straßenlaternen mit einem Draw Call
 */
export const InstancedStreetLamps: React.FC<InstancedLampsProps> = ({
    positions,
    isNight = false
}) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Geometrie: Vereinfachte Laterne
    const geometry = useMemo(() => {
        const geo = new THREE.CylinderGeometry(0.08, 0.12, 4.5, 12);
        return geo;
    }, []);

    // Material
    const material = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            map: createMetalTexture(256),
            color: 0x2F2F2F,
            roughness: 0.4,
            metalness: 0.8,
        });
    }, []);

    // Setze Positionen
    useEffect(() => {
        if (!meshRef.current) return;

        positions.forEach((pos, i) => {
            dummy.position.set(pos.position[0], pos.position[1] + 2.25, pos.position[2]);
            if (pos.rotation) {
                dummy.rotation.set(pos.rotation[0], pos.rotation[1], pos.rotation[2]);
            }
            dummy.scale.setScalar(pos.scale || 1);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [positions, dummy]);

    return (
        <group name="InstancedStreetLamps">
            <instancedMesh
                ref={meshRef}
                args={[geometry, material, positions.length]}
                castShadow
                receiveShadow
            />

            {/* Optional: PointLights für Nacht */}
            {isNight && positions.map((pos, i) => (
                <pointLight
                    key={`lamp-light-${i}`}
                    position={[pos.position[0], pos.position[1] + 4.5, pos.position[2]]}
                    color={0xFFE4B5}
                    intensity={1.5}
                    distance={15}
                    decay={2}
                />
            ))}
        </group>
    );
};

interface InstancedTreesProps {
    positions: InstancePosition[];
}

/**
 * InstancedTrees - Viele Bäume mit wenigen Draw Calls
 * Verwendet separate Meshes für Stamm und Krone
 */
export const InstancedTrees: React.FC<InstancedTreesProps> = ({ positions }) => {
    const trunkRef = useRef<THREE.InstancedMesh>(null);
    const crownRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Stamm-Geometrie
    const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.2, 0.35, 3, 12), []);
    const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({
        map: createWoodTexture(256),
        color: 0x4A3728,
        roughness: 0.9,
    }), []);

    // Krone-Geometrie
    const crownGeo = useMemo(() => new THREE.SphereGeometry(2.5, 16, 12), []);
    const crownMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0x2D5A27,
        roughness: 0.8,
    }), []);

    // Setze Positionen
    useEffect(() => {
        if (!trunkRef.current || !crownRef.current) return;

        positions.forEach((pos, i) => {
            const scale = pos.scale || 1;

            // Stamm
            dummy.position.set(pos.position[0], pos.position[1] + 1.5 * scale, pos.position[2]);
            dummy.scale.setScalar(scale);
            dummy.updateMatrix();
            trunkRef.current!.setMatrixAt(i, dummy.matrix);

            // Krone
            dummy.position.set(pos.position[0], pos.position[1] + 4.5 * scale, pos.position[2]);
            dummy.scale.setScalar(scale * (0.8 + Math.random() * 0.4));
            dummy.updateMatrix();
            crownRef.current!.setMatrixAt(i, dummy.matrix);
        });

        trunkRef.current.instanceMatrix.needsUpdate = true;
        crownRef.current.instanceMatrix.needsUpdate = true;
    }, [positions, dummy]);

    return (
        <group name="InstancedTrees">
            <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, positions.length]} castShadow />
            <instancedMesh ref={crownRef} args={[crownGeo, crownMat, positions.length]} castShadow receiveShadow />
        </group>
    );
};

interface InstancedTrashBinsProps {
    positions: InstancePosition[];
}

/**
 * InstancedTrashBins - Wiener Mülleimer instanziert
 */
export const InstancedTrashBins: React.FC<InstancedTrashBinsProps> = ({ positions }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const geometry = useMemo(() => new THREE.CylinderGeometry(0.25, 0.22, 0.8, 16), []);
    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0xFFD700, // Wien-Standard Gelb
        roughness: 0.6,
        metalness: 0.1,
    }), []);

    useEffect(() => {
        if (!meshRef.current) return;

        positions.forEach((pos, i) => {
            dummy.position.set(pos.position[0], pos.position[1] + 0.4, pos.position[2]);
            dummy.scale.setScalar(pos.scale || 1);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [positions, dummy]);

    return (
        <instancedMesh ref={meshRef} args={[geometry, material, positions.length]} castShadow receiveShadow />
    );
};

interface InstancedPollersProps {
    positions: InstancePosition[];
}

/**
 * InstancedPollers - Viele Poller für Absperrungen
 */
export const InstancedPollers: React.FC<InstancedPollersProps> = ({ positions }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const geometry = useMemo(() => new THREE.CylinderGeometry(0.08, 0.1, 1, 12), []);
    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color: 0x606060,
        roughness: 0.3,
        metalness: 0.9,
    }), []);

    useEffect(() => {
        if (!meshRef.current) return;

        positions.forEach((pos, i) => {
            dummy.position.set(pos.position[0], pos.position[1] + 0.5, pos.position[2]);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [positions, dummy]);

    return (
        <instancedMesh ref={meshRef} args={[geometry, material, positions.length]} castShadow />
    );
};

export default {
    InstancedStreetLamps,
    InstancedTrees,
    InstancedTrashBins,
    InstancedPollers,
};
