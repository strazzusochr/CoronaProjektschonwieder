import React, { useEffect, useState } from 'react';
import { performanceProfiler } from '@/managers/PerformanceProfiler';
import { useGameStore } from '@/stores/gameStore';

/**
 * PerformanceHUD - Advanced Metrics Overlay
 * Displays real-time engine stats (FPS, ms, Draw Calls)
 */
const PerformanceHUD: React.FC = () => {
    const isDebug = useGameStore(state => state.debugMode.fps);
    const [metrics, setMetrics] = useState(performanceProfiler.getMetrics());

    useEffect(() => {
        if (!isDebug) return;

        const interval = setInterval(() => {
            setMetrics({ ...performanceProfiler.getMetrics() });
        }, 250);

        return () => clearInterval(interval);
    }, [isDebug]);

    if (!isDebug) return null;

    const fpsColor = metrics.fps > 55 ? '#4ade80' : metrics.fps > 30 ? '#fbbf24' : '#f87171';

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(10, 10, 15, 0.85)',
            padding: '12px',
            borderRadius: '6px',
            color: '#e2e8f0',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '11px',
            pointerEvents: 'none',
            zIndex: 9999,
            border: '1px solid rgba(148, 163, 184, 0.2)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            width: '180px'
        }}>
            <div style={{
                color: '#60a5fa',
                fontWeight: 700,
                letterSpacing: '0.05em',
                marginBottom: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '4px'
            }}> ENGINE STATS </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>FPS:</span>
                <span style={{ color: fpsColor, fontWeight: 'bold' }}>{metrics.fps}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>FRAME TIME:</span>
                <span>{metrics.frameTime.toFixed(2)}ms</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>DRAW CALLS:</span>
                <span style={{ color: '#fcd34d' }}>{metrics.drawCalls || 0}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>LATENCY:</span>
                <span style={{ color: '#94a3b8' }}>{metrics.latency}ms</span>
            </div>

            {metrics.memory && (
                <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>HEAP:</span>
                        <span>{metrics.memory.used} / {metrics.memory.total} MB</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceHUD;
