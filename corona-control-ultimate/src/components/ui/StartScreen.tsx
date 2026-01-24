import React from 'react';
import { useGameStore } from '@/stores/gameStore';

const StartScreen: React.FC = () => {
    const startGame = useGameStore(state => state.startGame);

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
            backgroundColor: '#101015',
            color: '#ECF0F1',
            zIndex: 1000,
            fontFamily: 'Courier New, monospace'
        }}>
            <h1 style={{ 
                fontSize: '4rem', 
                marginBottom: '1rem',
                color: '#E53935',
                textShadow: '0 0 20px rgba(229, 57, 53, 0.6)' 
            }}>
                CORONA CONTROL ULTIMATE
            </h1>
            
            <div style={{
                marginBottom: '3rem',
                textAlign: 'center',
                maxWidth: '600px',
                lineHeight: '1.6',
                border: '1px solid #333',
                padding: '2rem',
                borderRadius: '8px',
                backgroundColor: '#1C1C24'
            }}>
                <h2 style={{ color: '#90CAF9', marginBottom: '1rem' }}>Einsatzbefehl</h2>
                <p>Die Ordnung in Wien ist zusammengebrochen.</p>
                <p>Ihre Aufgabe: <strong>Deeskalieren Sie die Lage.</strong></p>
                
                <h3 style={{ marginTop: '2rem', color: '#81C784' }}>Steuerung</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    <li><strong style={{ color: '#E0E0E0' }}>WASD</strong> - Bewegen</li>
                    <li><strong style={{ color: '#E0E0E0' }}>Maus</strong> - Umsehen</li>
                    <li><strong style={{ color: '#E0E0E0' }}>Linksklick</strong> - Molotow werfen (Nicht tödlich)</li>
                    <li><strong style={{ color: '#E0E0E0' }}>Shift</strong> - Sprinten</li>
                </ul>
            </div>

            <button 
                onClick={startGame}
                style={{
                    padding: '1rem 3rem',
                    fontSize: '1.5rem',
                    backgroundColor: '#E53935',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(229, 57, 53, 0.4)',
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                EINSATZ STARTEN
            </button>

            <div style={{ marginTop: '3rem', fontSize: '0.8rem', color: '#666' }}>
                v0.6 Alpha build
            </div>
        </div>
    );
};

export default StartScreen;
