import React, { useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import SaveLoadUI from './SaveLoadUI';

const PauseMenu: React.FC = () => {
    const resetGame = useGameStore(state => state.resetGame);
    const openSettings = useGameStore(state => state.openSettings);
    const [saveLoadMode, setSaveLoadMode] = useState<'SAVE' | 'LOAD' | null>(null);

    const togglePause = () => {
        useGameStore.setState(state => ({
            gameState: {
                ...state.gameState,
                menuState: 'PLAYING',
                isPlaying: true
            }
        }));
    };

    const buttonStyle = {
        padding: '15px 40px',
        fontSize: '1.5rem',
        background: 'rgba(255,255,255,0.1)',
        color: 'white',
        border: '2px solid white',
        borderRadius: '5px',
        cursor: 'pointer',
        textTransform: 'uppercase' as const,
        letterSpacing: '2px'
    };

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 4000
        }}>
            <h2 style={{ fontSize: '4rem', color: 'white', marginBottom: '2rem', textTransform: 'uppercase' }}>PAUSE</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <button
                    onClick={togglePause}
                    style={buttonStyle}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'white', e.currentTarget.style.color = 'black')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)', e.currentTarget.style.color = 'white')}
                >
                    Fortsetzen
                </button>

                <button
                    onClick={() => setSaveLoadMode('SAVE')}
                    style={buttonStyle}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'white', e.currentTarget.style.color = 'black')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)', e.currentTarget.style.color = 'white')}
                >
                    💾 Speichern
                </button>

                <button
                    onClick={() => setSaveLoadMode('LOAD')}
                    style={buttonStyle}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'white', e.currentTarget.style.color = 'black')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)', e.currentTarget.style.color = 'white')}
                >
                    📂 Laden
                </button>

                <button
                    onClick={openSettings}
                    style={buttonStyle}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'white', e.currentTarget.style.color = 'black')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)', e.currentTarget.style.color = 'white')}
                >
                    Einstellungen
                </button>

                <button
                    onClick={resetGame}
                    style={{
                        ...buttonStyle,
                        background: 'rgba(100,0,0,0.5)',
                        color: 'red',
                        border: '2px solid red'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'red', e.currentTarget.style.color = 'white')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(100,0,0,0.5)', e.currentTarget.style.color = 'red')}
                >
                    Hauptmenü
                </button>
            </div>

            {/* Save/Load Modal */}
            {saveLoadMode && (
                <SaveLoadUI mode={saveLoadMode} onClose={() => setSaveLoadMode(null)} />
            )}
        </div>
    );
};

export default PauseMenu;

