/**
 * MultiplayerUI - Connection Status & Player List
 * Phase 22: Multiplayer-Networking
 */
import React, { useEffect, useState } from 'react';
import { networkManager } from '@/managers/NetworkManager';

const MultiplayerUI: React.FC = () => {
    const [connected, setConnected] = useState(false);
    const [playerCount, setPlayerCount] = useState(0);

    useEffect(() => {
        // Simple polling for status updates (in a real app, use store or subscriptions)
        const interval = setInterval(() => {
            setConnected(networkManager.isConnected);
            setPlayerCount(networkManager.remotePlayers.size + 1); // +1 self
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!connected) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.6)',
            padding: '8px 12px',
            borderRadius: '6px',
            color: '#4f8',
            fontSize: '12px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            zIndex: 5000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        }}>
            <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#4f8',
                boxShadow: '0 0 5px #4f8'
            }} />
            <span>ONLINE ({playerCount} Players)</span>
        </div>
    );
};

export default MultiplayerUI;
