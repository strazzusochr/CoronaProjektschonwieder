
import React, { useEffect } from 'react';
import { useDialogStore } from '@/managers/DialogManager';
import type { DialogNode, DialogChoice } from '@/types/DialogTypes';

const DialogUI: React.FC = () => {
    const { isOpen, currentNode, advance, closeDialog } = useDialogStore();

    useEffect(() => {
        if (isOpen) {
            document.exitPointerLock();
        } else {
            const canvas = document.querySelector('canvas');
            if (canvas) canvas.requestPointerLock();
        }
    }, [isOpen]);

    // TTS Effect
    useEffect(() => {
        if (isOpen && currentNode?.text) {
            import('@/managers/AccessibilityManager').then(m => {
                m.default.getInstance().speak(currentNode.text);
            });
        }
    }, [currentNode, isOpen]);

    if (!isOpen || !currentNode) return null;

    const handleChoice = (index: number) => {
        advance(index);
    };

    const handleContinue = () => {
        advance();
    };

    // Helper für Emotions-Farben
    const getEmotionColor = (emotion?: string) => {
        switch (emotion) {
            case 'ANGRY': return '#ef5350';
            case 'HAPPY': return '#66bb6a';
            case 'SAD': return '#42a5f5';
            case 'AFRAID': return '#ab47bc';
            case 'SURPRISED': return '#ffca28';
            default: return '#4fc3f7'; // Neutral Blue
        }
    };

    const borderColor = getEmotionColor(currentNode.emotion);

    return (
        <div style={{
            position: 'absolute',
            bottom: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '700px',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            border: `2px solid ${borderColor}`,
            borderRadius: '10px',
            padding: '20px',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            zIndex: 1000,
            boxShadow: `0 0 20px ${borderColor}80`
        }}>
            {/* Header: Speaker & Emotion */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ color: borderColor, margin: 0, fontSize: '1.4rem' }}>
                    {currentNode.speakerId || 'Unknown'}
                </h3>
                {currentNode.emotion && (
                    <span style={{
                        fontSize: '0.8rem',
                        backgroundColor: borderColor,
                        color: 'black',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                    }}>
                        {currentNode.emotion}
                    </span>
                )}
            </div>

            {/* Dialog Text */}
            <p style={{ fontSize: '1.2rem', lineHeight: '1.6', marginBottom: '25px' }}>
                {currentNode.text}
            </p>

            {/* Choices or Continue */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentNode.type === 'PLAYER_CHOICE' && currentNode.choices ? (
                    currentNode.choices.map((choice, index) => (
                        <button
                            key={index}
                            onClick={() => handleChoice(index)}
                            style={{
                                padding: '12px 15px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid #666',
                                color: 'white',
                                cursor: 'pointer',
                                textAlign: 'left',
                                borderRadius: '5px',
                                fontSize: '1rem',
                                transition: 'all 0.2s',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = `${borderColor}30`;
                                e.currentTarget.style.borderColor = borderColor;
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = '#666';
                            }}
                        >
                            <span>➤ {choice.text}</span>
                            {choice.skillCheck && (
                                <span style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                    [{choice.skillCheck.skillType} {choice.skillCheck.difficulty}]
                                </span>
                            )}
                        </button>
                    ))
                ) : (
                    <button
                        onClick={handleContinue}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: borderColor,
                            border: 'none',
                            color: 'black',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            borderRadius: '5px',
                            alignSelf: 'flex-end',
                            fontSize: '1rem'
                        }}
                    >
                        Weiter ➤
                    </button>
                )}
            </div>
        </div>
    );
};

export default DialogUI;
