import React, { useState, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';

const ACCESS_CODE = import.meta.env.VITE_ACCESS_CODE ?? '20262026';
const FONT_MONO = 'Courier New, monospace' as const;

const LoginScreen: React.FC = () => {
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);

    const handleDigit = useCallback((digit: string) => {
        if (input.length >= 8) return;
        const next = input + digit;
        setInput(next);
        setError(false);

        if (next.length === 8) {
            if (next === ACCESS_CODE) {
                useGameStore.setState(s => ({
                    gameState: { ...s.gameState, menuState: 'MAIN' }
                }));
            } else {
                setError(true);
                setTimeout(() => {
                    setInput('');
                    setError(false);
                }, 1000);
            }
        }
    }, [input]);

    const handleDelete = useCallback(() => {
        setInput(prev => prev.slice(0, -1));
        setError(false);
    }, []);

    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#0a0a10',
            color: '#ECF0F1',
            zIndex: 2000,
            fontFamily: FONT_MONO,
        }}>
            <h1 style={{
                fontSize: '2.5rem',
                marginBottom: '0.5rem',
                color: '#E53935',
                textShadow: '0 0 20px rgba(229, 57, 53, 0.6)',
                letterSpacing: '0.1em'
            }}>
                CORONA CONTROL ULTIMATE
            </h1>
            <p style={{ color: '#666', marginBottom: '2.5rem', fontSize: '0.9rem', letterSpacing: '0.15em' }}>
                ZUGANGSCODE ERFORDERLICH
            </p>

            {/* Code display */}
            <div style={{
                display: 'flex',
                gap: '0.6rem',
                marginBottom: '1.5rem',
            }}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{
                        width: '3rem',
                        height: '3.5rem',
                        border: `2px solid ${error ? '#E53935' : input.length > i ? '#90CAF9' : '#333'}`,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.8rem',
                        color: error ? '#E53935' : '#ECF0F1',
                        backgroundColor: '#1C1C24',
                        transition: 'border-color 0.15s',
                        boxShadow: input.length > i ? '0 0 8px rgba(144, 202, 249, 0.3)' : 'none',
                    }}>
                        {input.length > i ? '●' : ''}
                    </div>
                ))}
            </div>

            {error && (
                <p style={{ color: '#E53935', fontSize: '0.85rem', marginBottom: '1rem', letterSpacing: '0.1em' }}>
                    FALSCHER CODE
                </p>
            )}

            {/* Numpad */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 4rem)',
                gap: '0.6rem',
                marginBottom: '0.6rem',
            }}>
                {digits.slice(0, 9).map(d => (
                    <button key={d} onClick={() => handleDigit(d)} style={btnStyle}>
                        {d}
                    </button>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button onClick={handleDelete} style={{ ...btnStyle, width: '4rem', backgroundColor: '#2a1a1a', borderColor: '#7f1d1d' }}>
                    ⌫
                </button>
                <button onClick={() => handleDigit('0')} style={btnStyle}>
                    0
                </button>
                <button onClick={() => setInput('')} style={{ ...btnStyle, width: '4rem', backgroundColor: '#2a1a1a', borderColor: '#7f1d1d', fontSize: '0.75rem' }}>
                    CLR
                </button>
            </div>
        </div>
    );
};

const btnStyle: React.CSSProperties = {
    width: '4rem',
    height: '4rem',
    fontSize: '1.4rem',
    backgroundColor: '#1C1C24',
    color: '#ECF0F1',
    border: '2px solid #333',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s, border-color 0.15s',
    fontFamily: FONT_MONO,
};

export default LoginScreen;
