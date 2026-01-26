/**
 * AntiCheatManager - Client-side Integrity & Monitoring
 * Phase 24: Anti-Cheat-Systems
 */
import { useGameStore } from '@/stores/gameStore';
import { networkManager } from '@/managers/NetworkManager';

class AntiCheatManager {
    private static instance: AntiCheatManager;
    private violations = 0;
    private lastPosition: [number, number, number] | null = null;
    private lastTime: number = Date.now();

    // Constants
    private readonly MAX_SPEED = 25.0; // Slightly higher than server to avoid false positives on lag
    private readonly MAX_VIOLATIONS = 5;

    private constructor() {
        this.startMonitoring();
    }

    public static getInstance(): AntiCheatManager {
        if (!this.instance) {
            this.instance = new AntiCheatManager();
        }
        return this.instance;
    }

    private startMonitoring() {
        setInterval(() => {
            this.checkSpeed();
            this.checkStats();
        }, 1000);
    }

    private checkSpeed() {
        const state = useGameStore.getState();
        if (state.gameState.menuState !== 'PLAYING') {
            this.lastPosition = null;
            return;
        }

        const currentPos = state.player.position;
        const currentTime = Date.now();

        if (this.lastPosition) {
            const dx = currentPos[0] - this.lastPosition[0];
            const dy = currentPos[1] - this.lastPosition[1];
            const dz = currentPos[2] - this.lastPosition[2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const timeDiff = (currentTime - this.lastTime) / 1000; // Seconds

            if (timeDiff > 0) {
                const speed = dist / timeDiff;
                if (speed > this.MAX_SPEED) {
                    this.reportViolation(`Speed Hack detected: ${speed.toFixed(2)} u/s`);
                }
            }
        }

        this.lastPosition = [...currentPos];
        this.lastTime = currentTime;
    }

    private checkStats() {
        const state = useGameStore.getState();

        // Check for impossible stats
        if (state.player.health > 100) { // Assuming 100 is max
            this.reportViolation(`Health Value Anomaly: ${state.player.health}`);
            // Auto-fix
            useGameStore.getState().setPlayerHealth(100);
        }

        if (state.gameState.points < 0) {
            this.reportViolation(`Negative Score Anomaly`);
        }
    }

    private reportViolation(reason: string) {
        this.violations++;
        console.warn(`[🛡️ Anti-Cheat] Violation #${this.violations}: ${reason}`);

        // Notify Player
        useGameStore.getState().setPrompt(`⚠️ Warnung: Verdächtige Aktivität erkannt! (${this.violations}/${this.MAX_VIOLATIONS})`);
        setTimeout(() => useGameStore.getState().setPrompt(null), 3000);

        // Report to Server via NetworkManager (if connected)
        if (networkManager.isConnected) {
            // We would emit a specific secure event here, simplified for now
            // socket.emit('clientReport', { reason });
        }

        // Action
        if (this.violations >= this.MAX_VIOLATIONS) {
            this.punishCheater();
        }
    }

    private punishCheater() {
        console.error('[🛡️ Anti-Cheat] MAX VIOLATIONS REACHED. KICKING PLAYER.');
        useGameStore.getState().setGameOver(true);
        useGameStore.getState().setPrompt('🚫 BANNED: Cheating detected.');

        // Force disconnect
        networkManager.disconnect();
    }
}

export const antiCheatManager = AntiCheatManager.getInstance();
