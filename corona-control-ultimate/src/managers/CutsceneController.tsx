import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '@/stores/gameStore';
import * as THREE from 'three';
import { CUTSCENE_DATA } from '@/data/cutscenes';

// Lokale Typdefinition
export interface LocalCutsceneStep {
    time: number;
    duration: number;
    cameraPos: [number, number, number];
    cameraLookAt: [number, number, number];
    dialogue?: string;
    speaker?: string;
    subtitle?: string;
}

const CutsceneController: React.FC = () => {
    const activeCutscene = useGameStore(state => state.gameState.activeCutscene);
    const endCutscene = useGameStore(state => state.endCutscene);
    const setCutsceneTime = useGameStore(state => state.setCutsceneTime);

    const startTime = useRef<number | null>(null);
    const { camera } = useThree();

    const data = activeCutscene ? CUTSCENE_DATA[activeCutscene] : null;

    useEffect(() => {
        // Expose skip function
        (window as any).skipCutscene = () => endCutscene();

        if (activeCutscene) {
            startTime.current = Date.now();
            setCutsceneTime(0);
        } else {
            startTime.current = null;
        }
    }, [activeCutscene, endCutscene, setCutsceneTime]);

    useFrame(() => {
        if (!activeCutscene || !startTime.current || !data) return;

        const delta = Date.now() - startTime.current;

        // Sync time to store for UI Overlay
        setCutsceneTime(delta);

        // Find current step for Camera Logic
        const currentStep = ([...data.steps] as unknown[] as LocalCutsceneStep[])
            .reverse()
            .find(s => delta >= s.time);

        if (currentStep) {
            const targetPos = new THREE.Vector3(...currentStep.cameraPos);
            // Smooth Camera
            camera.position.lerp(targetPos, 0.05);
            camera.lookAt(new THREE.Vector3(...currentStep.cameraLookAt));
        }

        if (delta > data.totalDuration) {
            endCutscene();
        }
    });

    return null; // No rendering, logic only
};

export default CutsceneController;
