/**
 * Corona Control Ultimate - World Streaming Renderer
 * Managt das dynamische Laden und Entladen von Chunks um den Spieler
 */

import React, { useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/gameStore';
import WienGenerator from '@/world/WienGenerator';
import type { ChunkData } from '@/world/WienGenerator';
import ChunkRenderer from './ChunkRenderer';

const WorldStreamingRenderer: React.FC = () => {
    const playerPos = useGameStore(state => state.player.position);
    const [visibleChunks, setVisibleChunks] = useState<ChunkData[]>([]);
    const [lastUpdatePos, setLastUpdatePos] = useState<[number, number]>([0, 0]);

    // Update Chunks wenn Spieler sich 10m bewegt hat
    useFrame(() => {
        const dx = playerPos[0] - lastUpdatePos[0];
        const dz = playerPos[2] - lastUpdatePos[1];

        if (Math.abs(dx) > 10 || Math.abs(dz) > 10) {
            const chunks = WienGenerator.updateStreamingPools(playerPos[0], playerPos[2]);

            // Filter Center Chunk (0,0) as it is handled by StephansplatzGeometry
            const filteredChunks = chunks.filter(c => c.x !== 0 || c.z !== 0);

            setVisibleChunks(filteredChunks);
            setLastUpdatePos([playerPos[0], playerPos[2]]);
        }
    });

    // Initial load
    useEffect(() => {
        const chunks = WienGenerator.updateStreamingPools(playerPos[0], playerPos[2]);
        setVisibleChunks(chunks.filter(c => c.x !== 0 || c.z !== 0));
    }, []);

    return (
        <group name="WorldStreaming">
            {visibleChunks.map(chunk => (
                <ChunkRenderer key={`${chunk.x},${chunk.z}`} chunk={chunk} />
            ))}
        </group>
    );
};

export default WorldStreamingRenderer;
