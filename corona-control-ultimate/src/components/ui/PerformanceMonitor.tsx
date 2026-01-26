/**
 * PerformanceMonitor - FPS und Memory Monitoring
 * Gemäß AAA Grafik V4.0 Spezifikation Teil 12.3
 * 
 * Zeigt:
 * - FPS (Frames per Second)
 * - Frame Time (ms)
 * - Memory Usage
 * - Draw Calls
 * - Triangle Count
 */
import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';

interface PerformanceStats {
    fps: number;
    frameTime: number;
    drawCalls: number;
    triangles: number;
    textures: number;
    geometries: number;
}

interface PerformanceMonitorProps {
    show?: boolean;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * In-Canvas Performance Monitor
 * Zeigt Stats als HTML-Overlay
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
    show = true,
    position = 'top-left'
}) => {
    const { gl } = useThree();
    const [stats, setStats] = useState<PerformanceStats>({
        fps: 0,
        frameTime: 0,
        drawCalls: 0,
        triangles: 0,
        textures: 0,
        geometries: 0,
    });

    const frameCountRef = useRef(0);
    const lastTimeRef = useRef(performance.now());
    const frameTimesRef = useRef<number[]>([]);

    useFrame(() => {
        const now = performance.now();
        const delta = now - lastTimeRef.current;

        frameTimesRef.current.push(delta);
        if (frameTimesRef.current.length > 60) {
            frameTimesRef.current.shift();
        }

        frameCountRef.current++;

        // Update stats every 30 frames
        if (frameCountRef.current >= 30) {
            const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
            const fps = 1000 / avgFrameTime;

            setStats({
                fps: Math.round(fps),
                frameTime: Math.round(avgFrameTime * 10) / 10,
                drawCalls: gl.info.render.calls,
                triangles: gl.info.render.triangles,
                textures: gl.info.memory.textures,
                geometries: gl.info.memory.geometries,
            });

            frameCountRef.current = 0;
        }

        lastTimeRef.current = now;
    });

    if (!show) return null;

    const positionStyles: Record<string, React.CSSProperties> = {
        'top-left': { top: 10, left: 10 },
        'top-right': { top: 10, right: 10 },
        'bottom-left': { bottom: 10, left: 10 },
        'bottom-right': { bottom: 10, right: 10 },
    };

    const fpsColor = stats.fps >= 60 ? '#00ff00' : stats.fps >= 30 ? '#ffff00' : '#ff0000';

    return (
        <Html
            position={[0, 0, 0]}
            style={{
                position: 'fixed',
                ...positionStyles[position],
                background: 'rgba(0, 0, 0, 0.8)',
                padding: '10px 15px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#fff',
                minWidth: '180px',
                pointerEvents: 'none',
                zIndex: 1000,
            }}
        >
            <div style={{ marginBottom: '5px', borderBottom: '1px solid #444', paddingBottom: '5px' }}>
                <strong>Performance Monitor</strong>
            </div>
            <div style={{ color: fpsColor, fontSize: '18px', fontWeight: 'bold' }}>
                {stats.fps} FPS
            </div>
            <div style={{ color: '#888' }}>
                Frame: {stats.frameTime}ms
            </div>
            <div style={{ marginTop: '8px', borderTop: '1px solid #444', paddingTop: '8px', fontSize: '11px' }}>
                <div>Draw Calls: {stats.drawCalls}</div>
                <div>Triangles: {(stats.triangles / 1000).toFixed(1)}K</div>
                <div>Textures: {stats.textures}</div>
                <div>Geometries: {stats.geometries}</div>
            </div>
        </Html>
    );
};

/**
 * usePerformanceStats - Hook für Performance-Daten
 */
export const usePerformanceStats = () => {
    const { gl } = useThree();
    const [stats, setStats] = useState<PerformanceStats | null>(null);

    useFrame(() => {
        setStats({
            fps: 0, // Wird extern berechnet
            frameTime: 0,
            drawCalls: gl.info.render.calls,
            triangles: gl.info.render.triangles,
            textures: gl.info.memory.textures,
            geometries: gl.info.memory.geometries,
        });
    });

    return stats;
};

/**
 * PolygonCounter - Zählt alle Polygone in der Szene
 * Für Validierung gemäß Teil 14.1
 */
export const usePolygonCount = () => {
    const { scene } = useThree();
    const [totalPolygons, setTotalPolygons] = useState(0);

    useEffect(() => {
        let total = 0;

        scene.traverse((object) => {
            if ((object as any).geometry) {
                const geo = (object as any).geometry;
                if (geo.index) {
                    total += geo.index.count / 3;
                } else if (geo.attributes?.position) {
                    total += geo.attributes.position.count / 3;
                }
            }
        });

        setTotalPolygons(Math.round(total));
    }, [scene]);

    return totalPolygons;
};

/**
 * Console-Polygon-Zähler
 * Loggt Details zu allen Geometrien
 */
export const logPolygonDetails = (scene: THREE.Scene) => {
    console.group('=== POLYGON COUNT ===');

    let totalTriangles = 0;
    const objects: { name: string; triangles: number }[] = [];

    scene.traverse((object) => {
        if ((object as any).geometry) {
            const geo = (object as any).geometry;
            let tris = 0;

            if (geo.index) {
                tris = geo.index.count / 3;
            } else if (geo.attributes?.position) {
                tris = geo.attributes.position.count / 3;
            }

            const name = object.name || object.type || 'Unknown';
            objects.push({ name, triangles: Math.round(tris) });
            totalTriangles += tris;
        }
    });

    // Sort by polygon count
    objects.sort((a, b) => b.triangles - a.triangles);

    // Log top 20
    objects.slice(0, 20).forEach((obj) => {
        console.log(`${obj.name}: ${obj.triangles.toLocaleString()} tris`);
    });

    console.log('---');
    console.log(`TOTAL: ${Math.round(totalTriangles).toLocaleString()} triangles`);
    console.groupEnd();

    return totalTriangles;
};

export default PerformanceMonitor;
