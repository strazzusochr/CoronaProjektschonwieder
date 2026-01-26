
import { useGameStore } from '@/stores/gameStore';

type MusicState = 'AMBIENT' | 'TENSION' | 'COMBAT';

class MusicManager {
    private static instance: MusicManager;
    private currentState: MusicState = 'AMBIENT';
    private lastTensionCheck: number = 0;

    private constructor() { }

    public static getInstance(): MusicManager {
        if (!MusicManager.instance) {
            MusicManager.instance = new MusicManager();
        }
        return MusicManager.instance;
    }

    public update(delta: number) {
        const now = Date.now();
        if (now - this.lastTensionCheck < 1000) return; // Check every second
        this.lastTensionCheck = now;

        const tension = useGameStore.getState().tensionLevel;
        let newState: MusicState = 'AMBIENT';

        if (tension > 80) {
            newState = 'COMBAT';
        } else if (tension > 40) {
            newState = 'TENSION';
        }

        if (newState !== this.currentState) {
            this.transitionTo(newState);
        }
    }

    private transitionTo(newState: MusicState) {
        console.log(`[MusicManager] Transitioning from ${this.currentState} to ${newState}`);
        this.currentState = newState;

        // Placeholder for actual audio crossfading
        // In a real implementation, we would fade out current track and fade in new track
        // AudioSystem.getInstance().playMusic(newState);
    }

    public getCurrentState(): MusicState {
        return this.currentState;
    }
}

export default MusicManager;
