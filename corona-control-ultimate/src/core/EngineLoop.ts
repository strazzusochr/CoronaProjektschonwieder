/**
 * Corona Control Ultimate - Core Engine Loop
 * Gemäß V6.0 Spezifikation
 * 
 * Mehrschichtige Update-Frequenz-Architektur:
 * - Physik: 120 Hz (8.33ms)
 * - Render: 60 Hz (16.67ms)
 * - KI: 10 Hz (100ms)
 * - Uhr/UI: 1 Hz (1000ms)
 * - Globale Events: 0.2 Hz (5000ms)
 */

import TimeSystem from './TimeSystem';
import DeescalationManager from '@/systems/DeescalationManager';

// Update-Frequenzen in Millisekunden
export const UPDATE_FREQUENCIES = {
    PHYSICS: 8.33,    // 120 Hz
    RENDER: 16.67,    // 60 Hz
    AI: 100,          // 10 Hz
    UI: 1000,         // 1 Hz
    GLOBAL: 5000      // 0.2 Hz
} as const;

// Akkumulatoren für die verschiedenen Loops
interface LoopAccumulators {
    physics: number;
    ai: number;
    ui: number;
    global: number;
}

class EngineLoop {
    private static instance: EngineLoop;
    private accumulators: LoopAccumulators = {
        physics: 0,
        ai: 0,
        ui: 0,
        global: 0
    };

    private isRunning: boolean = false;

    // Callbacks für die verschiedenen Systeme
    private physicsCallbacks: Array<(delta: number) => void> = [];
    private aiCallbacks: Array<(delta: number) => void> = [];
    private uiCallbacks: Array<() => void> = [];
    private globalCallbacks: Array<() => void> = [];

    private constructor() { }

    public static getInstance(): EngineLoop {
        if (!EngineLoop.instance) {
            EngineLoop.instance = new EngineLoop();
        }
        return EngineLoop.instance;
    }

    /**
     * Hauptupdate-Funktion - wird von React Three Fiber's useFrame aufgerufen
     */
    public update(_currentTime: number, delta: number): void {
        if (!this.isRunning) return;

        // Zeitdelta in Millisekunden
        const deltaMs = delta * 1000;

        // TimeSystem Update (immer, für Spielzeit)
        TimeSystem.update(delta);

        // Akkumulatoren aktualisieren
        this.accumulators.physics += deltaMs;
        this.accumulators.ai += deltaMs;
        this.accumulators.ui += deltaMs;
        this.accumulators.global += deltaMs;

        // Physik-Loop (120 Hz)
        while (this.accumulators.physics >= UPDATE_FREQUENCIES.PHYSICS) {
            const fixedDelta = UPDATE_FREQUENCIES.PHYSICS / 1000;
            this.physicsCallbacks.forEach(cb => cb(fixedDelta));
            this.accumulators.physics -= UPDATE_FREQUENCIES.PHYSICS;
        }

        // KI-Loop (10 Hz)
        if (this.accumulators.ai >= UPDATE_FREQUENCIES.AI) {
            const aiDelta = this.accumulators.ai / 1000;
            this.aiCallbacks.forEach(cb => cb(aiDelta));

            // Phase 4: Social Dynamics passive update
            DeescalationManager.passiveUpdate(aiDelta);

            this.accumulators.ai = 0;
        }

        // UI-Loop (1 Hz)
        if (this.accumulators.ui >= UPDATE_FREQUENCIES.UI) {
            this.uiCallbacks.forEach(cb => cb());
            this.accumulators.ui = 0;
        }

        // Global Events (0.2 Hz)
        if (this.accumulators.global >= UPDATE_FREQUENCIES.GLOBAL) {
            this.globalCallbacks.forEach(cb => cb());
            this.accumulators.global = 0;
        }
    }

    /**
     * Engine starten
     */
    public start(): void {
        this.isRunning = true;
    }

    /**
     * Engine pausieren
     */
    public pause(): void {
        this.isRunning = false;
    }

    /**
     * Callback für Physik-Loop registrieren (120 Hz)
     */
    public onPhysicsUpdate(callback: (delta: number) => void): () => void {
        this.physicsCallbacks.push(callback);
        return () => {
            const idx = this.physicsCallbacks.indexOf(callback);
            if (idx > -1) this.physicsCallbacks.splice(idx, 1);
        };
    }

    /**
     * Callback für KI-Loop registrieren (10 Hz)
     */
    public onAIUpdate(callback: (delta: number) => void): () => void {
        this.aiCallbacks.push(callback);
        return () => {
            const idx = this.aiCallbacks.indexOf(callback);
            if (idx > -1) this.aiCallbacks.splice(idx, 1);
        };
    }

    /**
     * Callback für UI-Loop registrieren (1 Hz)
     */
    public onUIUpdate(callback: () => void): () => void {
        this.uiCallbacks.push(callback);
        return () => {
            const idx = this.uiCallbacks.indexOf(callback);
            if (idx > -1) this.uiCallbacks.splice(idx, 1);
        };
    }

    /**
     * Callback für Globale Events registrieren (0.2 Hz)
     */
    public onGlobalUpdate(callback: () => void): () => void {
        this.globalCallbacks.push(callback);
        return () => {
            const idx = this.globalCallbacks.indexOf(callback);
            if (idx > -1) this.globalCallbacks.splice(idx, 1);
        };
    }
}

export default EngineLoop.getInstance();
