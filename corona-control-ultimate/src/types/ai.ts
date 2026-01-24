export type StimulusType = 'VISUAL' | 'AUDIO' | 'TOUCH';

export interface Stimulus {
    type: StimulusType;
    position: [number, number, number];
    sourceId?: number; // NPC ID or Player ID (e.g. 0 for player)
    intensity: number; // 0-1
    timestamp: number;
    tags?: string[]; // e.g., 'GUNSHOT', 'PLAYER', 'EXPLOSION'
}

export interface PerceptionConfig {
    fov: number; // Degrees
    viewDistance: number;
    hearingRange: number;
    reactionTime: number; // ms
}
