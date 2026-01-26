import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';

const SettingsMenu: React.FC = () => {
    // Global state instead of local
    const closeSettings = useGameStore(state => state.closeSettings);
    const settings = useGameStore(state => state.settings);
    const setVolume = useGameStore(state => state.setVolume);
    const setAccessibilitySetting = useGameStore(state => state.setAccessibilitySetting);
    const [activeTab, setActiveTab] = useState<'AUDIO' | 'GRAFIK' | 'ZUGÄNGLICHKEIT'>('AUDIO');

    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 5000,
            color: 'white', fontFamily: 'Courier New, monospace'
        }}>
            <div style={{
                width: '700px', height: '600px', padding: '40px',
                backgroundColor: '#1E1E24', border: '2px solid #4fc3f7', borderRadius: '10px',
                boxShadow: '0 0 20px rgba(79, 195, 247, 0.3)',
                display: 'flex', flexDirection: 'column'
            }}>
                <h2 style={{ textAlign: 'center', borderBottom: '1px solid #444', paddingBottom: '20px', fontSize: '2rem', color: '#4fc3f7', margin: 0 }}>
                    SYSTEM KONFIGURATION
                </h2>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #444', marginBottom: '20px', marginTop: '20px' }}>
                    {['AUDIO', 'GRAFIK', 'ZUGÄNGLICHKEIT'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            style={{
                                flex: 1, padding: '15px',
                                background: activeTab === tab ? '#4fc3f7' : 'transparent',
                                color: activeTab === tab ? 'black' : 'white',
                                border: 'none', cursor: 'pointer', fontWeight: 'bold',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>

                    {/* Audio Settings */}
                    {activeTab === 'AUDIO' && (
                        <div>
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <label>Master Volume</label>
                                    <span>{Math.round(settings.masterVolume * 100)}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="1" step="0.05"
                                    value={settings.masterVolume}
                                    onChange={(e) => setVolume('MASTER', parseFloat(e.target.value))}
                                    style={{ width: '100%', cursor: 'pointer' }}
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <label>Music Volume</label>
                                    <span>{Math.round(settings.musicVolume * 100)}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="1" step="0.05"
                                    value={settings.musicVolume}
                                    onChange={(e) => setVolume('MUSIC', parseFloat(e.target.value))}
                                    style={{ width: '100%', cursor: 'pointer' }}
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <label>SFX Volume</label>
                                    <span>{Math.round(settings.sfxVolume * 100)}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="1" step="0.05"
                                    value={settings.sfxVolume}
                                    onChange={(e) => setVolume('SFX', parseFloat(e.target.value))}
                                    style={{ width: '100%', cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Graphics Settings */}
                    {activeTab === 'GRAFIK' && (
                        <div>
                            <h3 style={{ color: '#aaa', borderBottom: '1px solid #333', paddingBottom: '5px' }}>QUALITÄT</h3>
                            <div style={{ marginTop: '15px', display: 'flex', gap: '15px' }}>
                                {['LOW', 'MEDIUM', 'HIGH'].map((quality) => (
                                    <button
                                        key={quality}
                                        onClick={() => setGraphicsQuality(quality as 'LOW' | 'MEDIUM' | 'HIGH')}
                                        style={{
                                            flex: 1, padding: '15px',
                                            backgroundColor: settings.graphicsQuality === quality ? '#4fc3f7' : '#333',
                                            color: settings.graphicsQuality === quality ? 'black' : 'white',
                                            border: 'none', borderRadius: '4px', cursor: 'pointer',
                                            fontWeight: 'bold', transition: 'all 0.2s'
                                        }}
                                    >
                                        {quality}
                                    </button>
                                ))}
                            </div>
                            <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '10px' }}>
                                Beeinflusst Schatten, Beleuchtung und Effekte.
                            </p>
                        </div>
                    )}

                    {/* Accessibility Settings */}
                    {activeTab === 'ZUGÄNGLICHKEIT' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Colorblind Mode */}
                            <div>
                                <h3 style={{ color: '#aaa', borderBottom: '1px solid #333', paddingBottom: '5px' }}>FARBENBLINDHEIT</h3>
                                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {['NONE', 'DEUTERANOPIA', 'PROTANOPIA', 'TRITANOPIA'].map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => setAccessibilitySetting('colorblindMode', mode)}
                                            style={{
                                                padding: '10px',
                                                backgroundColor: settings.colorblindMode === mode ? '#4fc3f7' : '#333',
                                                color: settings.colorblindMode === mode ? 'black' : 'white',
                                                border: 'none', borderRadius: '4px', cursor: 'pointer'
                                            }}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* TTS */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#333', padding: '15px', borderRadius: '5px' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>Text-to-Speech (TTS)</div>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Liest Dialoge und Hinweise vor.</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.ttsEnabled}
                                    onChange={(e) => setAccessibilitySetting('ttsEnabled', e.target.checked)}
                                    style={{ width: '25px', height: '25px', cursor: 'pointer' }}
                                />
                            </div>

                            {/* Large Text */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#333', padding: '15px', borderRadius: '5px' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>Große Schrift</div>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Vergrößert die Benutzeroberfläche um 20%.</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.largeTextEnabled}
                                    onChange={(e) => setAccessibilitySetting('largeTextEnabled', e.target.checked)}
                                    style={{ width: '25px', height: '25px', cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                    )}

                </div>

                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={closeSettings}
                        style={{
                            padding: '15px 50px', backgroundColor: 'transparent',
                            color: '#e53935', border: '2px solid #e53935', borderRadius: '5px', cursor: 'pointer',
                            fontSize: '1.2em', textTransform: 'uppercase', letterSpacing: '2px',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#e53935', e.currentTarget.style.color = 'white')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = '#e53935')}
                    >
                        ZURÜCK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsMenu;
