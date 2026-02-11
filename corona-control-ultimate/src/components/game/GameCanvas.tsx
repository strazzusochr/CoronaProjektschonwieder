import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { WebGPURenderer } from 'three/webgpu';
import { useEngineLoop } from '@/core/EngineLoopManager';
import DynamicLighting from '@/rendering/DynamicLighting';
import { StephansplatzWorld } from '@/world/WienScene';
import { InteractionDetector } from './InteractionDetector';
import { InstancedCrowd } from '@/components/characters/InstancedCrowd';
import { PlayerCharacter } from './entities/PlayerCharacter';
import { npcAiManager } from '@/managers/NPCAIManager';

/**
 * V7.0 HYPER AAA MASTER GAME CANVAS
 */

const SceneContent = () => {
    // V7.0 Engine Loop Hook
    useEngineLoop({
        onPhysics: () => {
            // physics system update here
        },
        onAI: () => {
            // NPC AI Logic Heartbeat (10Hz)
            npcAiManager.update();
        },
        onEvent: () => {
            console.log('[EngineLoop] Event Heartbeat (0.2Hz)');
        }
    });

    return (
        <>
            <DynamicLighting quality="HIGH" castShadows={true} />

            <Suspense fallback={null}>
                <StephansplatzWorld />
                <InteractionDetector />
                <PlayerCharacter />
                <InstancedCrowd />
            </Suspense>

            <Environment preset="city" />
            <OrbitControls makeDefault />
        </>
    );
};

export const GameCanvas = () => {
    return (
        <Canvas
            shadows
            camera={{ position: [20, 20, 20], fov: 45 }}
            gl={(canvas) => new WebGPURenderer({
                canvas: canvas as unknown as HTMLCanvasElement,
                antialias: true
            })}
            style={{ background: '#050505' }}
        >
            <SceneContent />
        </Canvas>
    );
};
