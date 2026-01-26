import React from 'react';
import { useGameStore } from '@/stores/gameStore';

const MainMenu: React.FC = () => {
    const startGame = useGameStore(state => state.startGame);
    const loadGame = useGameStore(state => state.loadGame);
    const [hasSave, setHasSave] = React.useState(false);

    React.useEffect(() => {
        const saved = localStorage.getItem('corona_control_save');
        setHasSave(!!saved);
    }, []);

    const handleLoad = () => {
        if (loadGame()) {
            // Success
        }
    };

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: '#111',
            backgroundImage: 'url(/assets/menu_bg.jpg)', // Placeholder
            backgroundSize: 'cover',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 4000
        }}>
            <h1 style={{ fontSize: '5rem', color: '#4fc3f7', textShadow: '0 0 20px #4fc3f7', marginBottom: '3rem', fontFamily: 'Orbitron' }}>
                CORONA CONTROL
                <span style={{ fontSize: '2rem', display: 'block', textAlign: 'right', color: 'white' }}>ULTIMATE</span>
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <button
                    onClick={startGame}
                    style={{
                        padding: '15px 40px', fontSize: '1.5rem', background: 'rgba(0,0,0,0.8)', color: 'white',
                        border: '2px solid #4fc3f7', borderRadius: '5px', cursor: 'pointer',
                        transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '2px'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#4fc3f7', e.currentTarget.style.color = 'black')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.8)', e.currentTarget.style.color = 'white')}
                >
                    Neues Spiel
                </button>

                <button
                    onClick={handleLoad}
                    disabled={!hasSave}
                    style={{
                        padding: '15px 40px', fontSize: '1.5rem',
                        background: hasSave ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
                        color: hasSave ? 'white' : '#555',
                        border: hasSave ? '2px solid white' : '2px solid #555',
                        borderRadius: '5px', cursor: hasSave ? 'pointer' : 'not-allowed',
                        textTransform: 'uppercase', letterSpacing: '2px'
                    }}
                    onMouseOver={(e) => hasSave && (e.currentTarget.style.background = 'white', e.currentTarget.style.color = 'black')}
                    onMouseOut={(e) => hasSave && (e.currentTarget.style.background = 'rgba(0,0,0,0.8)', e.currentTarget.style.color = 'white')}
                >
                    Spiel Laden
                </button>

                <button
                    style={{
                        padding: '15px 40px', fontSize: '1.5rem', background: 'rgba(0,0,0,0.8)', color: 'white',
                        border: '2px solid white', borderRadius: '5px', cursor: 'pointer',
                        textTransform: 'uppercase', letterSpacing: '2px'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'white', e.currentTarget.style.color = 'black')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.8)', e.currentTarget.style.color = 'white')}
                >
                    Einstellungen
                </button>
            </div>

            <div style={{ position: 'absolute', bottom: '20px', color: '#555' }}>v1.1.0 - PRE-ALPHA BUILD</div>
        </div>
    );
};

export default MainMenu;
