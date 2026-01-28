import React, { useEffect, useState } from 'react';
import { performanceProfiler } from '@/managers/PerformanceProfiler';
import { useGameStore } from '@/stores/gameStore';

/**
 * PerformanceUI - Real-time metrics display
 * Phase 26: Performance-Profiling-Tools
 */
const PerformanceUI: React.FC = () => {
    const isDebug = useGameStore(state => state.debugMode.fps);
    const [metrics, setMetrics] = useState(performanceProfiler.getMetrics());

    useEffect(() => {
        if (!isDebug) return;

        const interval = setInterval(() => {
            setMetrics({ ...performanceProfiler.getMetrics() });
        }, 500);

        return () => clearInterval(interval);
    }, [isDebug]);

    if (!isDebug) return null;

    const fpsColor = metrics.fps > 55 ? '#4ade80' : metrics.fps > 30 ? '#fbbf24' : '#f87171';

    return (
        <div style={{
            position: 'absolute',
            top: '80px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.7)',
            padding: '10px',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(4px)',
            width: '140px'
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#60a5fa', borderBottom: '1px solid #333', paddingBottom: '4px' }}> PERFORMANCE </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>FPS:</span>
                <span style={{ color: fpsColor, fontWeight: 'bold' }}>{metrics.fps}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Frametime:</span>
                <span>{metrics.frameTime.toFixed(1)}ms</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Latency:</span>
                <span style={{ color: '#60a5fa' }}>{metrics.latency}ms</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Draw Calls:</span>
                <span style={{ color: '#fbbf24' }}>{metrics.drawCalls || 0}</span>
            </div>

            {metrics.memory && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #333' }}>
                    <span>Memory:</span>
                    <span>{metrics.memory.used}MB</span>
                </div>
            )}
        </div>
    );
};

export default PerformanceUI;
