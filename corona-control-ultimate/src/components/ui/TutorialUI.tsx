/**
 * TutorialUI - Visuelles Tutorial-Overlay
 * Phase 20: Tutorial-System
 */
import React from 'react';
import { useTutorialStore } from '@/managers/TutorialManager';

const TutorialUI: React.FC = () => {
    const { isActive, currentStepIndex, steps, advanceStep, skipTutorial, getCurrentStep } = useTutorialStore();
    const currentStep = getCurrentStep();

    if (!isActive || !currentStep) return null;

    const positionStyle = {
        TOP: { top: '10%' },
        BOTTOM: { bottom: '15%' },
        CENTER: { top: '50%', transform: 'translateY(-50%)' },
    }[currentStep.position || 'CENTER'];

    return (
        <div style={{
            position: 'fixed',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 9999,
            pointerEvents: 'none',
            ...positionStyle,
        }}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(20, 20, 40, 0.95), rgba(40, 40, 80, 0.9))',
                border: '2px solid rgba(100, 150, 255, 0.6)',
                borderRadius: '16px',
                padding: '24px 40px',
                minWidth: '400px',
                maxWidth: '600px',
                boxShadow: '0 8px 32px rgba(0, 100, 255, 0.3)',
                pointerEvents: 'auto',
                animation: 'tutorialPulse 2s ease-in-out infinite',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                }}>
                    <h2 style={{
                        color: '#7df',
                        fontSize: '1.4rem',
                        margin: 0,
                        fontWeight: 'bold',
                        textShadow: '0 0 10px rgba(100, 200, 255, 0.5)',
                    }}>
                        📚 {currentStep.title}
                    </h2>
                    <span style={{ color: '#888', fontSize: '0.9rem' }}>
                        {currentStepIndex + 1} / {steps.length}
                    </span>
                </div>

                {/* Description */}
                <p style={{
                    color: '#ddd',
                    fontSize: '1.1rem',
                    lineHeight: 1.6,
                    margin: '0 0 20px 0',
                }}>
                    {currentStep.description}
                </p>

                {/* Progress Bar */}
                <div style={{
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '2px',
                    marginBottom: '16px',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #4af, #7df)',
                        transition: 'width 0.3s ease',
                    }} />
                </div>

                {/* Buttons */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                }}>
                    <button
                        onClick={skipTutorial}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 100, 100, 0.5)',
                            color: '#f88',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                        }}
                    >
                        Tutorial überspringen
                    </button>
                    <button
                        onClick={advanceStep}
                        style={{
                            background: 'linear-gradient(135deg, #4a8, #2a6)',
                            border: 'none',
                            color: '#fff',
                            padding: '10px 30px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 12px rgba(0, 200, 100, 0.3)',
                        }}
                    >
                        {currentStepIndex === steps.length - 1 ? 'Abschließen' : 'Weiter →'}
                    </button>
                </div>
            </div>

            {/* CSS Animation */}
            <style>{`
                @keyframes tutorialPulse {
                    0%, 100% { box-shadow: 0 8px 32px rgba(0, 100, 255, 0.3); }
                    50% { box-shadow: 0 8px 48px rgba(0, 150, 255, 0.5); }
                }
            `}</style>
        </div>
    );
};

export default TutorialUI;
