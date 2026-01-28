/**
 * Corona Control Ultimate - DayNightCycleSystem
 * Gemäß V6.0 Spezifikation: Timeline-Event-Manager
 * 
 * Verwaltet:
 * - Phasen-Übergänge (Morgen, Mittag, Abend, Nacht)
 * - Zeit-spezifische Events (Laternen-Flicker, Sonnenaufgang)
 * - NPC-Spawn-Trigger
 */

import TimeSystem from '@/core/TimeSystem';
import EngineLoop from '@/core/EngineLoop';
import { useGameStore } from '@/stores/gameStore';

class DayNightCycleSystem {
    private static instance: DayNightCycleSystem;
    private lastMinute: number = -1;

    // Lantern Flicker State
    private lanternFlickerActive: boolean = false;
    private lanternFlickerStartTime: number = 0;

    private constructor() {
        // Registriere beim EngineLoop (Logic Update 10Hz reicht für Events)
        EngineLoop.onAIUpdate(this.update.bind(this));
    }

    public static getInstance(): DayNightCycleSystem {
        if (!DayNightCycleSystem.instance) {
            DayNightCycleSystem.instance = new DayNightCycleSystem();
        }
        return DayNightCycleSystem.instance;
    }

    /**
     * Haupt-Update-Funktion
     */
    public update(_delta: number): void {
        const currentMinutes = TimeSystem.getCurrentGameMinutes();
        const currentMinuteInt = Math.floor(currentMinutes);

        // Nur einmal pro Spielminute prüfen
        if (currentMinuteInt !== this.lastMinute) {
            this.checkScheduledEvents(currentMinuteInt);
            this.lastMinute = currentMinuteInt;
        }

        // Kontinuierliche Updates (z.B. Flicker-Sequenz)
        if (this.lanternFlickerActive) {
            this.updateLanternFlicker(currentMinutes);
        }
    }

    /**
     * Prüft geplante Events basierend auf der Uhrzeit
     */
    private checkScheduledEvents(minute: number): void {
        // --- MORGEN (06:00 - 12:00) ---

        // 06:00 - Sonnenaufgang beginnt
        if (minute === 360) { // 6 * 60
            console.log("🌅 TIMELINE EVENT: Phase 1 - Morgen beginnt");
            useGameStore.getState().setPrompt("06:00 - Die Stadt erwacht...");
        }

        // 06:03 - Laternen Flacker-Sequenz Start
        if (minute === 363) {
            console.log("💡 TIMELINE EVENT: Laternen Flacker-Sequenz Start");
            this.startLanternFlicker();
        }

        // --- MITTAG (12:00 - 18:00) ---

        // 12:00 - Das Ultimatum
        if (minute === 720) {
            console.log("⚠️ TIMELINE EVENT: Phase 2 - Mittag (Eskalation)");
            useGameStore.getState().setPrompt("12:00 - ULTIMATUM DER POLIZEI");
            // Hier würde der Audio-Trigger für das Ultimatum kommen
        }

        // --- ABEND (18:00 - 22:00) ---

        // 18:00 - Goldene Stunde
        if (minute === 1080) {
            console.log("🌆 TIMELINE EVENT: Phase 3 - Abend (Chaos)");
            useGameStore.getState().setPrompt("18:00 - Die Situation eskaliert...");
        }

        // 19:30 - Pyro-Show
        if (minute === 1170) {
            console.log("🔥 TIMELINE EVENT: Pyro-Show (Bengalos)");
        }

        // --- NACHT (22:00 - 06:00) ---

        // 22:00 - Säuberung
        if (minute === 1320) {
            console.log("🌙 TIMELINE EVENT: Phase 4 - Nacht");
            useGameStore.getState().setPrompt("22:00 - Nächtliche Ruhe kehrt ein...");
        }
    }

    /**
     * Startet die Laternen-Sequenz
     */
    private startLanternFlicker(): void {
        this.lanternFlickerActive = true;
        this.lanternFlickerStartTime = TimeSystem.getCurrentGameMinutes();
    }

    /**
     * Aktualisiert den Flicker-Status der Laternen
     */
    private updateLanternFlicker(currentMinutes: number): void {
        const elapsedMinutes = currentMinutes - this.lanternFlickerStartTime;
        // Konvertiere zu Sekunden für die Sequenz-Tabelle (die in Sekunden definiert ist)
        const elapsedSeconds = elapsedMinutes; // Da wir 1:60 haben, ist 1 Spielminute = 1 Realsekunde

        // Sequenz läuft ca. 5 Sekunden
        if (elapsedSeconds > 5) {
            this.lanternFlickerActive = false;
            console.log("💡 TIMELINE EVENT: Laternen AUS");
            return;
        }

        // Hier könnte man Events an den Renderer senden
        // z.B. Events.emit('lantern-update', { intensity: ... })
    }
}

export default DayNightCycleSystem.getInstance();
