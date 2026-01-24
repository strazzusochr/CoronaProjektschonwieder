import * as THREE from 'three';

export interface PerceptionEvent {
    type: 'VISUAL' | 'AUDIO' | 'TOUCH';
    sourceId: string; // ID of the entity seen/heard
    position: THREE.Vector3;
    intensity: number; // 0-1 (Confidence for visual, Volume for audio)
    timestamp: number;
    metadata?: any;
}

export class PerceptionSystem {
    private events: PerceptionEvent[] = [];
    private readonly MEMORY_DURATION = 5000; // ms to keep raw events in buffer

    // Vision Params
    private fov: number = 120; // Degrees
    private viewDistance: number = 30; // Meters
    private eyeHeight: number = 1.6;

    constructor() { }

    public update(delta: number, ownerPosition: THREE.Vector3, ownerForward: THREE.Vector3): void {
        // Cleanup old events
        const now = Date.now();
        this.events = this.events.filter(e => now - e.timestamp < this.MEMORY_DURATION);
    }

    public processVisualStimulus(sourcePos: THREE.Vector3, sourceId: string, ownerPos: THREE.Vector3, ownerForward: THREE.Vector3): void {
        // 1. Distance Check
        const distSq = ownerPos.distanceToSquared(sourcePos);
        if (distSq > this.viewDistance * this.viewDistance) return;

        // 2. Angle Check (FOV)
        const directionToTarget = new THREE.Vector3().subVectors(sourcePos, ownerPos).normalize();
        const angle = ownerForward.angleTo(directionToTarget) * (180 / Math.PI);

        if (angle > this.fov / 2) return;

        // 3. Line of Sight (Simplified for prototype, real Raycast would act on Physics World)
        // For Phase 6 basic implementation, we assume LoS if not obstructed. 
        // In a full integration, we'd pass the Physics world here.

        // Add Event
        this.addEvent({
            type: 'VISUAL',
            sourceId,
            position: sourcePos.clone(),
            intensity: 1.0 - (Math.sqrt(distSq) / this.viewDistance), // Falloff
            timestamp: Date.now()
        });
    }

    public processAudioStimulus(sourcePos: THREE.Vector3, volume: number, type: string): void {
        // Simple distance attenuation logic could go here
        this.addEvent({
            type: 'AUDIO',
            sourceId: 'unknown',
            position: sourcePos.clone(),
            intensity: volume,
            timestamp: Date.now(),
            metadata: { soundType: type }
        });
    }

    private addEvent(event: PerceptionEvent) {
        // Avoid duplicate events in the same frame/short window
        const recent = this.events.find(e =>
            e.type === event.type &&
            e.sourceId === event.sourceId &&
            Math.abs(e.timestamp - event.timestamp) < 100
        );
        if (!recent) {
            this.events.push(event);
        }
    }

    public getRecentEvents(): PerceptionEvent[] {
        return this.events;
    }

    public getNearestHostile(): PerceptionEvent | null {
        // Example utility
        return this.events.find(e => e.type === 'VISUAL' || e.type === 'TOUCH') || null;
    }
}
