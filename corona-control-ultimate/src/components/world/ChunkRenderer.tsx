/**
 * Corona Control Ultimate - Chunk Renderer
 * Rendert einen Welt-Chunk basierend auf generierten Daten
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ChunkData } from '@/world/WienGenerator';
import VienneseBuilding from '@/components/buildings/VienneseBuilding';
import EnvironmentObjects, { StreetLamp } from '@/components/environment/EnvironmentObjects';

const { Tree, ParkBench } = EnvironmentObjects;

interface ChunkRendererProps {
    chunk: ChunkData;
}

const ChunkRenderer: React.FC<ChunkRendererProps> = ({ chunk }) => {
    // Memoize static chunk components
    const buildings = useMemo(() => {
        return chunk.buildings.map((b, i) => (
            <VienneseBuilding
                key={b.id}
                position={[
                    chunk.x * 50 + b.width / 2 + (Math.random() - 0.5) * 20, // Offset within chunk
                    0,
                    chunk.z * 50 + b.depth / 2 + (Math.random() - 0.5) * 20
                ]}
                rotation={[0, (Math.floor(Math.random() * 4) * Math.PI / 2), 0]} // Snap to 90 degrees
                floors={b.floors}
                width={b.width}
                depth={b.depth}
                style={b.style === 'MODERN' ? 'modern' : (b.style === 'BAROQUE' ? 'ornate' : 'classic')}
            />
        ));
    }, [chunk]);

    const lights = useMemo(() => {
        return chunk.streetLights.map((pos, i) => (
            <StreetLamp
                key={`lamp_${chunk.x}_${chunk.z}_${i}`}
                position={[pos[0], pos[1], pos[2]] as [number, number, number]}
            />
        ));
    }, [chunk]);

    const trees = useMemo(() => {
        return chunk.trees.map((pos, i) => (
            <Tree
                key={`tree_${chunk.x}_${chunk.z}_${i}`}
                position={[pos[0], pos[1], pos[2]] as [number, number, number]}
                type={i % 2 === 0 ? 'linden' : 'chestnut'}
            />
        ));
    }, [chunk]);

    // Ground Plane for Chunk (Debugging/Fallback if main ground doesn't cover)
    // StephansplatzGeometry covers center, but chunks extend outwards.
    // We assume global ground plane handles physics, this logic handles visuals.

    return (
        <group>
            {buildings}
            {lights}
            {trees}
        </group>
    );
};

export default React.memo(ChunkRenderer);
