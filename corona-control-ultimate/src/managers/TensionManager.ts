import { useGameStore } from '@/stores/gameStore';
import GameEventSystem from '@/systems/GameEventSystem';
import type { StimulusType } from '@/types/ai';

class TensionManager {
    private static instance: TensionManager;
    private readonly DECAY_RATE = 0.5; // Points per second
    private readonly WAVE_THRESHOLD = 30; // Tension needed to start spawning waves
    private lastWaveTime = 0;

    private constructor() { }

    public static getInstance(): TensionManager {
        if (!TensionManager.instance) {
            TensionManager.instance = new TensionManager();
        }
        return TensionManager.instance;
    }

    public update(_delta: number, _currentTime: number) {
        // DATA MIGRATION: Logic moved to src/systems/TensionSystem.ts
        // This method is deprecated and should not be called.
    }

    // Call this when major events happen (Explosion, Player Kill)
    public triggerEvent(_type: StimulusType, value: number = 5) {
        const store = useGameStore.getState();
        store.setTension(store.tensionLevel + value);
    }
}

export default TensionManager;
