import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';

const SettingsMenu: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const settings = useGameStore(state => state.settings);
    const setVolume = useGameStore(state => state.setVolume);
    const setGraphicsQuality = useGameStore(state => state.setGraphicsQuality);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 3000,
            color: 'white', fontFamily: 'Courier New, monospace'
        }}>
            <div style={{
                width: '500px', padding: '30px',
                backgroundColor: '#1E1E24', border: '2px solid #555', borderRadius: '10px'
            }}>
                <h2 style={{ textAlign: 'center', borderBottom: '1px solid #444', paddingBottom: '10px' }}>EINSTELLUNGEN</h2>

                {/* Audio Settings */}
                <div style={{ marginBottom: '20px' }}>
                    <h3>AUDIO</h3>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Master Volume: {Math.round(settings.masterVolume * 100)}%</label>
                        <input 
                            type="range" min="0" max="1" step="0.1" 
                            value={settings.masterVolume}
                            onChange={(e) => setVolume('MASTER', parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    {/* Placeholder for other volumes if we had specific channels implemented */}
                </div>

                {/* Graphics Settings */}
                <div style={{ marginBottom: '30px' }}>
                    <h3>GRAFIK</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {['LOW', 'MEDIUM', 'HIGH'].map((quality) => (
                            <button
                                key={quality}
                                onClick={() => setGraphicsQuality(quality as 'LOW'|'MEDIUM'|'HIGH')}
                                style={{
                                    flex: 1, padding: '10px',
                                    backgroundColor: settings.graphicsQuality === quality ? '#4CAF50' : '#333',
                                    color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                                }}
                            >
                                {quality}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <button 
                        onClick={() => setIsOpen(false)}
                        style={{
                            padding: '10px 30px', backgroundColor: '#e53935',
                            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                            fontSize: '1em'
                        }}
                    >
                        SCHLIEßEN (ESC)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsMenu;
