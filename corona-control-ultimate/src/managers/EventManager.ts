import { TimeManager } from './TimeManager';
import { useGameStore } from '@/stores/gameStore';

export type EventType = 'SCHEDULED' | 'TRIGGERED' | 'CONDITIONAL';

export interface GameEvent {
    id: string;
    type: EventType;
    triggerTime?: number; // Seconds since midnight
    condition?: () => boolean;
    action: () => void;
    executed: boolean;
    description: string;
}

export class EventManager {
    private static instance: EventManager;
    private events: GameEvent[] = [];

    private constructor() {
        this.registerDefaultEvents();
    }

    public static getInstance(): EventManager {
        if (!EventManager.instance) {
            EventManager.instance = new EventManager();
        }
        return EventManager.instance;
    }

    private registerDefaultEvents() {
        // Event 1: Krause Arrives (14:00)
        this.registerEvent({
            id: 'krause_arrival',
            type: 'SCHEDULED',
            triggerTime: 14 * 3600, // 14:00
            executed: false,
            description: 'Martin Krause arrives at Stephansplatz',
            action: () => {
                useGameStore.getState().setPrompt("Martin Krause hat den Platz betreten! Überwache ihn.");
                // Spawn logic here if not already spawned
            }
        });

        // Event 2: Speech Start (14:10)
        this.registerEvent({
            id: 'speech_start',
            type: 'SCHEDULED',
            triggerTime: 14 * 3600 + 10 * 60, // 14:10
            executed: false,
            description: 'Krause Speech Starts',
            action: () => {
                useGameStore.getState().setPrompt("Die Rede beginnt. Die Menge tobt.");
                useGameStore.getState().setTension(50);
            }
        });
    }

    public registerEvent(event: GameEvent) {
        this.events.push(event);
    }

    public update() {
        const currentTime = TimeManager.getInstance().getSeconds();

        this.events.forEach(event => {
            if (event.executed) return;

            let shouldTrigger = false;

            if (event.type === 'SCHEDULED' && event.triggerTime !== undefined) {
                if (currentTime >= event.triggerTime) {
                    shouldTrigger = true;
                }
            } else if (event.type === 'CONDITIONAL' && event.condition) {
                if (event.condition()) {
                    shouldTrigger = true;
                }
            }

            if (shouldTrigger) {
                console.log(`[EVENT] Triggered: ${event.description}`);
                event.action();
                event.executed = true;
            }
        });
    }
}
