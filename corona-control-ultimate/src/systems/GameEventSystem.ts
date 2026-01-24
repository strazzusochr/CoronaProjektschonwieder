import type { Stimulus } from '@/types/ai';

class GameEventSystem {
    private static instance: GameEventSystem;
    private recentStimuli: Stimulus[] = [];
    private readonly EVENT_LIFETIME = 100; // ms, how long an event persists for perception

    private constructor() {}

    public static getInstance(): GameEventSystem {
        if (!GameEventSystem.instance) {
            GameEventSystem.instance = new GameEventSystem();
        }
        return GameEventSystem.instance;
    }

    public emit(stimulus: Stimulus) {
        this.recentStimuli.push(stimulus);
    }

    public getActiveStimuli(currentTime: number): Stimulus[] {
        // Filter expired
        this.recentStimuli = this.recentStimuli.filter(s => currentTime - s.timestamp < this.EVENT_LIFETIME);
        return this.recentStimuli;
    }

    public clear() {
        this.recentStimuli = [];
    }
}

export default GameEventSystem;
