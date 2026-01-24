import React, { useEffect, useState, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '@/stores/gameStore';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CUTSCENE_DATA } from '@/data/cutscenes';

// Lokale Typdefinition um Import-Fehler zu vermeiden
export interface LocalCutsceneStep {
    time: number;
    duration: number;
    cameraPos: [number, number, number];
    cameraLookAt: [number, number, number];
    dialogue?: string;
    speaker?: string;
    subtitle?: string;
}

const CutsceneManager: React.FC = () => {
    const activeCutscene = useGameStore(state => state.gameState.activeCutscene);
    const endCutscene = useGameStore(state => state.endCutscene);
    const [currentTime, setCurrentTime] = useState(0);
    const startTime = useRef<number | null>(null);
    const { camera } = useThree();

    const data = activeCutscene ? CUTSCENE_DATA[activeCutscene] : null;

    useEffect(() => {
        // Expose skip function for testing/debug
        (window as any).skipCutscene = () => endCutscene();

        if (activeCutscene) {
            startTime.current = Date.now();
            setCurrentTime(0);
        } else {
            startTime.current = null;
        }
    }, [activeCutscene, endCutscene]);

    useFrame(() => {
        if (!activeCutscene || !startTime.current || !data) return;

        const delta = Date.now() - startTime.current;
        setCurrentTime(delta);

        // Aktuellen Schritt finden (Typ-Cast auf lokale Schnittstelle)
        const currentStep = ([...data.steps] as unknown[] as LocalCutsceneStep[])
            .reverse()
            .find(s => delta >= s.time);

        if (currentStep) {
            const targetPos = new THREE.Vector3(...currentStep.cameraPos);
            camera.position.lerp(targetPos, 0.05);
            camera.lookAt(new THREE.Vector3(...currentStep.cameraLookAt));
        }

        if (delta > data.totalDuration) {
            endCutscene();
        }
    });

    if (!activeCutscene || !data) return null;

    const activeStep = ([...data.steps] as unknown[] as LocalCutsceneStep[])
        .reverse()
        .find(s => currentTime >= s.time);

    return (
        <Html fullscreen zIndexRange={[6000, 6000]} style={{ pointerEvents: 'none' }}>
            <div style={{
                position: 'absolute',
                bottom: '10%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80%',
                backgroundColor: 'rgba(0,0,0,0.85)',
                color: 'white',
                padding: '30px',
                borderRadius: '15px',
                textAlign: 'center',
                fontFamily: 'Outfit, sans-serif',
                zIndex: 6000,
                border: '2px solid #4fc3f7',
                boxShadow: '0 0 40px rgba(0,0,0,0.6)',
                pointerEvents: 'auto'
            }}>
                {activeStep?.speaker && (
                    <div style={{
                        color: '#4fc3f7',
                        marginBottom: '10px',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        textTransform: 'uppercase',
                        letterSpacing: '2px'
                    }}>
                        {activeStep.speaker}
                    </div>
                )}
                <div style={{ fontSize: '1.5rem', lineHeight: '1.5', fontWeight: 300 }}>
                    {activeStep?.dialogue || activeStep?.subtitle}
                </div>

                <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    height: '6px',
                    backgroundColor: '#4fc3f7',
                    width: `${Math.min(100, (currentTime / data.totalDuration) * 100)}%`,
                    transition: 'width 0.2s linear'
                }} />
            </div>
        </Html>
    );
};

export default CutsceneManager;
