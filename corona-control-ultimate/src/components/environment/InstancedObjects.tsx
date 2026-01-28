/**
 * InstancedObjects - Performance-optimierte Objekt-Instanzierung
 * Gemäß AAA Grafik V4.0 Spezifikation Teil 12
 */
import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
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

    const geometry = useMemo(() => new THREE.CylinderGeometry(0.08, 0.12, 4.5, 12), []);
    const material = useMemo(() => new THREE.MeshStandardMaterial({
        map: createMetalTexture(256),
        color: 0x2F2F2F,
        roughness: 0.4,
        metalness: 0.8,
    }), []);

    useEffect(() => {
        if (!meshRef.current) return;
        positions.forEach((pos, i) => {
            dummy.position.set(pos.position[0], pos.position[1] + 2.25, pos.position[2]);
            if (pos.rotation) dummy.rotation.set(...pos.rotation);
            dummy.scale.setScalar(pos.scale || 1);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [positions, dummy]);

    return (
        <group name="InstancedStreetLamps">
            <instancedMesh ref={meshRef} args={[geometry, material, positions.length]} castShadow receiveShadow />
            {isNight && positions.map((pos, i) => (
                <pointLight key={`lamp-light-${i}`} position={[pos.position[0], pos.position[1] + 4.5, pos.position[2]]} color={0xFFE4B5} intensity={1.5} distance={15} decay={2} />
            ))}
        </group>
    );
};

interface InstancedTreesProps {
    positions: InstancePosition[];
}

/**
 * InstancedTrees - Viele Bäume mit wenigen Draw Calls
 */
export const InstancedTrees: React.FC<InstancedTreesProps> = ({ positions }) => {
    const trunkRef = useRef<THREE.InstancedMesh>(null);
    const crownRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.2, 0.35, 3, 12), []);
    const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({
        map: createWoodTexture([74, 55, 40], 256),
        color: 0x4A3728,
        roughness: 0.9,
    }), []);

    const crownGeo = useMemo(() => new THREE.SphereGeometry(2.5, 16, 12), []);
    const crownMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x2D5A27, roughness: 0.8 }), []);

    useEffect(() => {
        if (!trunkRef.current || !crownRef.current) return;
        positions.forEach((pos, i) => {
            const scale = pos.scale || 1;
            dummy.position.set(pos.position[0], pos.position[1] + 1.5 * scale, pos.position[2]);
            dummy.scale.setScalar(scale);
            dummy.updateMatrix();
            trunkRef.current!.setMatrixAt(i, dummy.matrix);

            dummy.position.set(pos.position[0], pos.position[1] + 4.5 * scale, pos.position[2]);
            dummy.scale.setScalar(scale * 1.0); // Simplified variation for instancing
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

export const InstancedTrashBins: React.FC<InstancedTrashBinsProps> = ({ positions }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const geometry = useMemo(() => new THREE.CylinderGeometry(0.25, 0.22, 0.8, 16), []);
    const material = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.6, metalness: 0.1 }), []);

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

    return <instancedMesh ref={meshRef} args={[geometry, material, positions.length]} castShadow receiveShadow />;
};

interface InstancedPollersProps {
    positions: InstancePosition[];
}

export const InstancedPollers: React.FC<InstancedPollersProps> = ({ positions }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const geometry = useMemo(() => new THREE.CylinderGeometry(0.08, 0.1, 1, 12), []);
    const material = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 0.3, metalness: 0.9 }), []);

    useEffect(() => {
        if (!meshRef.current) return;
        positions.forEach((pos, i) => {
            dummy.position.set(pos.position[0], pos.position[1] + 0.5, pos.position[2]);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [positions, dummy]);

    return <instancedMesh ref={meshRef} args={[geometry, material, positions.length]} castShadow />;
};

interface InstancedParkBenchesProps {
    positions: InstancePosition[];
}

export const InstancedParkBenches: React.FC<InstancedParkBenchesProps> = ({ positions }) => {
    const legRef = useRef<THREE.InstancedMesh>(null);
    const slatRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const legGeo = useMemo(() => new THREE.BoxGeometry(0.1, 0.6, 0.45), []);
    const slatGeo = useMemo(() => new THREE.BoxGeometry(1.6, 0.03, 0.08), []);
    const ironMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1A1A1A, roughness: 0.5, metalness: 0.7 }), []);
    const woodMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.75 }), []);

    useEffect(() => {
        if (!legRef.current || !slatRef.current) return;
        positions.forEach((pos, i) => {
            const rotation = pos.rotation || [0, 0, 0];
            [-0.7, 0.7].forEach((xOff, legIdx) => {
                dummy.position.set(pos.position[0], pos.position[1] + 0.3, pos.position[2]);
                dummy.rotation.set(...rotation);
                dummy.translateX(xOff);
                dummy.updateMatrix();
                legRef.current!.setMatrixAt(i * 2 + legIdx, dummy.matrix);
            });
            [0, 0.1, 0.2, 0.3].forEach((zOff, slatIdx) => {
                dummy.position.set(pos.position[0], pos.position[1] + 0.45, pos.position[2]);
                dummy.rotation.set(...rotation);
                dummy.translateZ(zOff - 0.15);
                dummy.updateMatrix();
                slatRef.current!.setMatrixAt(i * 4 + slatIdx, dummy.matrix);
            });
        });
        legRef.current.instanceMatrix.needsUpdate = true;
        slatRef.current.instanceMatrix.needsUpdate = true;
    }, [positions, dummy]);

    return (
        <group name="InstancedParkBenches">
            <instancedMesh ref={legRef} args={[legGeo, ironMat, positions.length * 2]} castShadow />
            <instancedMesh ref={slatRef} args={[slatGeo, woodMat, positions.length * 4]} castShadow />
        </group>
    );
};

export default {
    InstancedStreetLamps,
    InstancedTrees,
    InstancedTrashBins,
    InstancedPollers,
    InstancedParkBenches,
};
