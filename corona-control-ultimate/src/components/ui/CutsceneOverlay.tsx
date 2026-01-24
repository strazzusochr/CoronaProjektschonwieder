import React from 'react';
import { useGameStore } from '@/stores/gameStore';
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

const CutsceneOverlay: React.FC = () => {
    const activeCutscene = useGameStore(state => state.gameState.activeCutscene);
    const time = useGameStore(state => state.gameState.cutsceneTime);

    // Explicitly hide if invalid state
    if (!activeCutscene) return null;

    // Retrieve data
    const data = CUTSCENE_DATA[activeCutscene];
    if (!data) return null;

    const activeStep = ([...data.steps] as unknown[] as LocalCutsceneStep[])
        .reverse()
        .find(s => time >= s.time);

    return (
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
                width: `${Math.min(100, (time / data.totalDuration) * 100)}%`,
                transition: 'width 0.2s linear'
            }} />
        </div>
    );
};

export default CutsceneOverlay;
