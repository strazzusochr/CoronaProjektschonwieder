import React from 'react';

const LoadingScreen: React.FC = () => {
    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: '#101015',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            color: '#4fc3f7', fontFamily: 'Courier New, monospace',
            zIndex: 9999
        }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>CORONA CONTROL</h1>
            <div style={{ fontSize: '1.5rem', animation: 'blink 1s infinite' }}>LÄDT RESSOURCEN...</div>
            <style>{`
                @keyframes blink { 50% { opacity: 0.5; } }
            `}</style>
        </div>
    );
};

export default LoadingScreen;
