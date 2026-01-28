import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { ChunkData } from './WienGenerator';
import VienneseBuilding from '@/components/buildings/VienneseBuilding';
import { createAsphaltTexture } from '@/utils/ProceduralTextures';

interface ChunkRendererProps {
    chunk: ChunkData;
}

const ChunkRenderer: React.FC<ChunkRendererProps> = React.memo(({ chunk }) => {
    // Generate static noise/seed based on chunk position for consistency
    const pseudoRandom = (x: number, z: number) => {
        return Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
    };

    // Ground Plane for the chunk
    const groundGeo = useMemo(() => new THREE.PlaneGeometry(100, 100), []);
    const groundMat = useMemo(() => new THREE.MeshStandardMaterial({
        map: createAsphaltTexture(512), // Simpler texture for distant chunks
        color: 0x444444,
        roughness: 0.9,
    }), []);

    // buildings in this chunk
    const buildingCount = chunk.type === 'district_1' ? 6 : 4;
    const CHUNK_SIZE = 50;

    return (
        <group position={[chunk.x * CHUNK_SIZE, 0, chunk.z * CHUNK_SIZE]}>
            {/* Ground */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.05, 0]}
                geometry={groundGeo}
                material={groundMat}
                receiveShadow
            />

            {/* Buildings based on chunk data */}
            {Array.from({ length: buildingCount }).map((_, i) => {
                const seed = pseudoRandom(chunk.x + i, chunk.z + i);

                // Position relative to chunk center
                let xOffset = (seed - 0.5) * (CHUNK_SIZE - 10);
                let zOffset = (pseudoRandom(chunk.x * (i + 1), chunk.z) - 0.5) * (CHUNK_SIZE - 10);

                // SAFETY: Clear center of the world (Stephansplatz)
                const worldX = chunk.x * CHUNK_SIZE + xOffset;
                const worldZ = chunk.z * CHUNK_SIZE + zOffset;
                if (Math.abs(worldX) < 15 && Math.abs(worldZ) < 15) {
                    return null; // Skip buildings too close to spawn/landmarks
                }

                const rotation = Math.floor(seed * 4) * (Math.PI / 2);
                const height = 4 + Math.floor(seed * 3);

                const style = seed > 0.7 ? 'ornate' : (seed > 0.4 ? 'corner' : 'classic');

                return (
                    <VienneseBuilding
                        key={`bld_${chunk.x}_${chunk.z}_${i}`}
                        position={[xOffset, 0, zOffset]}
                        rotation={[0, rotation, 0]}
                        floors={height}
                        style={style as any}
                    />
                );
            })}
        </group>
    );
});

export default ChunkRenderer;
