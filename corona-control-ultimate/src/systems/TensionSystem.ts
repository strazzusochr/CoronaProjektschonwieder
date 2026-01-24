
import { useGameStore } from '@/stores/gameStore';
import GameEventSystem from '@/systems/GameEventSystem';

/**
 * TensionSystem
 * Verwaltet die Eskalation des Chaos, den Spannungsabfall und die Logik für Wellen-Spawns.
 * Migriert von TensionManager, um im Haupt-GameSystem-Loop zu laufen.
 */
class TensionSystem {
    private readonly DECAY_RATE = 0.5; // Punkte pro Sekunde
    private readonly WAVE_THRESHOLD = 30; // Spannung benötigt, um Wellen zu starten
    private lastWaveTime = 0;

    public update(delta: number) {
        const store = useGameStore.getState();
        const currentTension = store.tensionLevel;
        const currentTime = Date.now();

        // 1. Verarbeite aktuelle Ereignisse
        const recentEvents = GameEventSystem.getInstance().getActiveStimuli(currentTime);
        let tensionIncrease = 0;

        // Chaos-Faktor: Häufige Ereignisse erhöhen die Basisspannung
        if (recentEvents.length > 5) {
            tensionIncrease += delta * 2;
        }

        // 2. Spannung abbauen
        let newTension = Math.max(0, currentTension - (this.DECAY_RATE * delta));

        // 3. Spawning-Logik
        if (newTension > this.WAVE_THRESHOLD) {
            if (currentTime - this.lastWaveTime > 10000) { // Check alle 10s
                // Höhere Spannung = Höhere Chance
                if (Math.random() < (newTension / 100) * 0.5) {
                    console.log("[TensionSystem] Anstieg! Spawne Welle.");
                    store.spawnWave(2 + Math.floor(newTension / 20), 'RIOTER');
                    store.setPrompt("ACHTUNG: Verstärkung trifft ein!");
                    this.lastWaveTime = currentTime;
                }
            }
        }

        // Begrenzen & Store aktualisieren
        newTension = Math.max(0, Math.min(100, newTension));
        if (Math.abs(newTension - currentTension) > 0.1) {
            store.setTension(newTension);
        }
    }
}

export default new TensionSystem();
