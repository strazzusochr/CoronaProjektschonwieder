/**
 * Corona Control Ultimate - NPC Spawn System
 * Gemäß V6.0 Spezifikation: "City Awakens" Event
 * 
 * Verwaltet das Zeit-basierte Spawnen von spezifischen NPCs
 * (Stefan, Maria, Heinrich) und generischen Bevölkerungswellen.
 */

import TimeSystem from '@/core/TimeSystem';
import EngineLoop from '@/core/EngineLoop';
import { useGameStore } from '@/stores/gameStore';
import type { NPCType, NPCState } from '@/types/npc';

// Spawn-Koordinaten (Platzhalter basierend auf Wien-Karte)
const SPAWN_POINTS = {
    BECKEREI: [-40, 0.5, 10] as [number, number, number], // Stefan
    UBAHN: [25, 0.5, -30] as [number, number, number],    // Maria, Pendler
    PARKBANK: [-20, 0.5, 15] as [number, number, number], // Heinrich
    HAAS_HAUS: [45, 0.5, 25] as [number, number, number]  // Touristen
};

class NPCSpawnSystem {
    private static instance: NPCSpawnSystem;
    private spawnedEvents: Set<string> = new Set();

    // NPC ID Counter (reserviert 0-999 für System/Spezial)
    private npcIdCounter: number = 1000;

    private constructor() {
        // Registriere beim EngineLoop (KI Update 10Hz)
        EngineLoop.onAIUpdate(this.update.bind(this));
        console.log("🚶 NPC SPAWN SYSTEM INITIALIZED (V6.0)");
    }

    public static getInstance(): NPCSpawnSystem {
        if (!NPCSpawnSystem.instance) {
            NPCSpawnSystem.instance = new NPCSpawnSystem();
        }
        return NPCSpawnSystem.instance;
    }

    /**
     * Haupt-Update-Funktion
     */
    public update(_delta: number): void {
        // ... (remaining logic)

        // --- 06:00: STEFAN (Der Bäcker) ---
        this.checkSpawnEvent('SPAWN_STEFAN', 6, 0, () => {
            console.log("👤 V6.0 EVENT: Stefan sperrt die Bäckerei auf");
            this.spawnUniqueNPC(101, 'STEFAN', SPAWN_POINTS.BECKEREI, 'WORKING');
        });

        // --- 06:15: MARIA (Die Pendlerin) ---
        this.checkSpawnEvent('SPAWN_MARIA', 6, 15, () => {
            console.log("👤 V6.0 EVENT: Maria kommt aus der U-Bahn");
            this.spawnUniqueNPC(102, 'MARIA', SPAWN_POINTS.UBAHN, 'WALKING');
        });

        // --- 06:30: HEINRICH (Der Rentner) ---
        this.checkSpawnEvent('SPAWN_HEINRICH', 6, 30, () => {
            console.log("👤 V6.0 EVENT: Heinrich setzt sich auf die Bank");
            this.spawnUniqueNPC(103, 'HEINRICH', SPAWN_POINTS.PARKBANK, 'SITTING');
        });

        // --- 07:00: BERUFSVERKEHR (Welle 1) ---
        this.checkSpawnEvent('WAVE_RUSH_HOUR', 7, 0, () => {
            console.log("👥 V6.0 EVENT: Berufsverkehr beginnt (25 NPCs)");
            useGameStore.getState().spawnWave(25, 'COMMUTER'); // Reduced from 50 for performance
        });

        // --- 09:00: TOURISTEN (Welle 2) ---
        this.checkSpawnEvent('WAVE_TOURISTS', 9, 0, () => {
            console.log("📸 V6.0 EVENT: Touristen-Busse kommen an (15 NPCs)");
            // Spawne nah beim Haas Haus/Dom - Reduced from 30 for performance
            for (let i = 0; i < 15; i++) {
                const offset: [number, number, number] = [
                    (Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20
                ];
                const pos: [number, number, number] = [
                    SPAWN_POINTS.HAAS_HAUS[0] + offset[0],
                    0.5,
                    SPAWN_POINTS.HAAS_HAUS[2] + offset[2]
                ];
                this.spawnUniqueNPC(this.npcIdCounter++, 'TOURIST', pos, 'IDLE');
            }
        });

        // --- 18:00: RUSH HOUR HOME (Welle 3) ---
        this.checkSpawnEvent('WAVE_COMMUTER_HOME', 18, 0, () => {
            console.log("🚇 V6.0 EVENT: Feierabendverkehr - U-Bahn füllt sich (30 NPCs)");
            useGameStore.getState().spawnWave(30, 'COMMUTER'); // Reduced from 60 for performance
        });

        // --- 20:00: BLACK BLOCK ASSEMBLY (Vorbereitung) ---
        this.checkSpawnEvent('WAVE_BLACK_BLOCK', 20, 0, () => {
            console.log("🏴 V6.0 EVENT: Schwarzer Block formiert sich (20 Rioters)");
            const store = useGameStore.getState();
            store.setTension(50); // Erhöhe Spannung
            store.setPrompt("WARNUNG: Verdächtige Gruppenbildung gemeldet!");

            // Reduced from 20 for performance
            for (let i = 0; i < 10; i++) {
                const pos: [number, number, number] = [
                    SPAWN_POINTS.UBAHN[0] + (Math.random() - 0.5) * 10,
                    0.5,
                    SPAWN_POINTS.UBAHN[2] + (Math.random() - 0.5) * 10
                ];
                this.spawnUniqueNPC(this.npcIdCounter++, 'RIOTER', pos, 'IDLE');
            }
        });

        // --- 22:00: RIOT ESCALATION (Eskalation) ---
        this.checkSpawnEvent('EVENT_RIOT_START', 22, 0, () => {
            console.log("🔥 V6.0 EVENT: ESKALATION! Molotow-Angriffe beginnen.");
            const store = useGameStore.getState();
            store.setTension(90); // Max Tension
            store.setPrompt("ALARM: Gewaltsame Ausschreitungen! Eindämmen!");

            // Alle Rioters auf Aggressiv setzen (via TensionSystem passiert das eh, aber hier Event Trigger)
            // Spawne mehr Rioters
            store.spawnWave(30, 'RIOTER');
        });
    }

    /**
     * Prüft, ob ein Event getriggert werden soll
     * (Nur einmal pro Tag)
     */
    private checkSpawnEvent(eventId: string, targetHour: number, targetMinute: number, callback: () => void): void {
        const now = TimeSystem.getCurrentGameMinutes();
        const eventTime = targetHour * 60 + targetMinute;

        // Trigger-Fenster: 1 Spielminute (oder check 'already spawned')
        // Wenn current >= target und noch nicht gespawnt
        if (now >= eventTime && !this.spawnedEvents.has(eventId)) {
            callback();
            this.spawnedEvents.add(eventId);
        }

        // Reset Event um Mitternacht (optional, falls Tagesschleife)
        if (now < 60 && this.spawnedEvents.has(eventId)) {
            // Reset für nächsten Tag
        }
    }

    /**
     * Spawnt einen einzigartigen NPC via Store
     */
    private spawnUniqueNPC(id: number, type: NPCType, position: [number, number, number], state: NPCState = 'IDLE'): void {
        const { addNPC } = useGameStore.getState();
        addNPC({
            id,
            type,
            position,
            state,
            rotation: 0 // V6.0 Requirement
        });
    }
}

export default NPCSpawnSystem.getInstance();
