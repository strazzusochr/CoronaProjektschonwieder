import * as THREE from 'three';

export interface MemoryEvent {
    id: string;
    eventType: string; // 'SEEN_PLAYER', 'HEARD_GUNSHOT', 'ATTACKED_BY_PLAYER'
    position: THREE.Vector3;
    timestamp: number;
    importance: number; // 0-10
    confidence: number; // 0-1
    expiration: number; // Timestamp when this fades
}

export class MemorySystem {
    private shortTermMemory: MemoryEvent[] = [];
    private longTermMemory: Map<string, any> = new Map(); // Concept/Fact storage

    private readonly STM_CAPACITY = 20;

    constructor() { }

    public addEvent(type: string, position: THREE.Vector3, importance: number, duration: number = 30000): void {
        const event: MemoryEvent = {
            id: Math.random().toString(36).substr(2, 9),
            eventType: type,
            position: position.clone(),
            timestamp: Date.now(),
            importance,
            confidence: 1.0,
            expiration: Date.now() + duration
        };

        // Insert based on importance and recency logic
        this.shortTermMemory.unshift(event);

        // Cap size
        if (this.shortTermMemory.length > this.STM_CAPACITY) {
            // Remove oldest, lowest importance
            this.shortTermMemory.sort((a, b) => {
                // Return > 0 if a should be effectively "higher index" (to be popped)
                // We want to keep High Importance and Newest.
                const scoreA = a.importance * 1000 + a.timestamp;
                const scoreB = b.importance * 1000 + b.timestamp;
                return scoreB - scoreA;
            });
            this.shortTermMemory.pop();
        }
    }

    public getBestEvent(type?: string): MemoryEvent | null {
        if (!type) return this.shortTermMemory[0] || null;
        return this.shortTermMemory.find(e => e.eventType === type) || null;
    }

    public hasEvent(type: string): boolean {
        return this.shortTermMemory.some(e => e.eventType === type);
    }

    public update(): void {
        const now = Date.now();
        this.shortTermMemory = this.shortTermMemory.filter(e => e.expiration > now);
    }
}
