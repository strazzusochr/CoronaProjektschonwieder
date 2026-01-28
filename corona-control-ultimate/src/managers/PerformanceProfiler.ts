/**
 * PerformanceProfiler - Real-time metrics tracking
 * Phase 26: Performance-Profiling-Tools
 */
import { useGameStore } from '@/stores/gameStore';

interface PerformanceMetrics {
    fps: number;
    frameTime: number;
    latency: number;
    memory?: {
        used: number;
        total: number;
    };
    drawCalls?: number;
}

class PerformanceProfiler {
    private static instance: PerformanceProfiler;
    private lastTime = performance.now();
    private frameCount = 0;
    private fps = 60;
    private frameTimes: number[] = [];
    private metrics: PerformanceMetrics = {
        fps: 60,
        frameTime: 16.6,
        latency: 0
    };

    private constructor() {
        this.init();
    }

    public static getInstance(): PerformanceProfiler {
        if (!this.instance) {
            this.instance = new PerformanceProfiler();
        }
        return this.instance;
    }

    private init() {
        requestAnimationFrame(this.loop.bind(this));

        // Periodic check for other metrics (memory, latency)
        setInterval(() => {
            this.updateSystemMetrics();
        }, 1000);
    }

    private loop() {
        const now = performance.now();
        const delta = now - this.lastTime;

        this.frameCount++;
        this.frameTimes.push(delta);
        if (this.frameTimes.length > 60) this.frameTimes.shift();

        if (delta >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / delta);
            this.frameCount = 0;
            this.lastTime = now;

            this.metrics.fps = this.fps;
            this.metrics.frameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;

            // Sync to store for UI (optional, only if needed for HUD)
            // useGameStore.getState().updatePerformance(this.metrics);
        }

        requestAnimationFrame(this.loop.bind(this));
    }

    private updateSystemMetrics() {
        // Memory (Chrome/Edge only)
        if ((performance as any).memory) {
            this.metrics.memory = {
                used: Math.round((performance as any).memory.usedJSHeapSize / 1048576),
                total: Math.round((performance as any).memory.jsHeapSizeLimit / 1048576)
            };
        }

        // Latency (grabbed from network manager if connected)
        // This is a placeholder for actual socket ping
        this.metrics.latency = Math.floor(Math.random() * 20) + 10; // Mock latency 10-30ms
    }

    public updateDrawCalls(calls: number) {
        this.metrics.drawCalls = calls;
    }

    public getMetrics(): PerformanceMetrics {
        return this.metrics;
    }
}

export const performanceProfiler = PerformanceProfiler.getInstance();
