import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
// import { WebGPURenderer } from 'three/webgpu';
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

            <OrbitControls makeDefault />
        </>
    );
};

export const GameCanvas = () => {
    const [isInitialized, setIsInitialized] = React.useState(false);

    return (
        <Canvas
            shadows
            camera={{ position: [20, 20, 20], fov: 45 }}
            style={{ background: '#050505' }}
            gl={{
                powerPreference: 'high-performance',
                antialias: true,
                preserveDrawingBuffer: true,
                alpha: false
            }}
            // V7 Hybrid: Robust Initialization Gate
            onCreated={({ gl }) => {
                const renderer = gl as any;

                // WebGL Context Loss Handling
                const canvas = renderer.domElement;
                canvas.addEventListener('webglcontextlost', (e: any) => {
                    e.preventDefault();
                    console.error('[Build 55] WebGL Context Lost! Rebuilding scene...');
                }, false);

                canvas.addEventListener('webglcontextrestored', () => {
                    console.log('[Build 55] WebGL Context Restored.');
                    window.location.reload();
                }, false);

                const finishInit = () => {
                    console.log('[Build 55] Renderer Ready.');
                    setIsInitialized(true);
                };

                if (renderer.init) {
                    renderer.init().then(finishInit).catch((err: any) => {
                        console.error('[Build 55] Renderer Init Failed, falling back:', err);
                        finishInit();
                    });
                } else {
                    finishInit();
                }
            }}
        >
            {isInitialized && <SceneContent />}
        </Canvas>
    );
};
