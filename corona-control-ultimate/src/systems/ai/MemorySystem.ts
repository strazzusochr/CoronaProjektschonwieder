import type { Stimulus } from '@/types/ai';

export interface MemoryEntry {
    stimulus: Stimulus;
    lastSeen: number;
    decay: number; // 0-1 confidence
}

export class MemorySystem {
    private stm: MemoryEntry[] = []; // Short Term Memory
    private readonly STM_DURATION = 5000; // 5 seconds retention

    public update(_delta: number, newStimuli: Stimulus[]) {
        const now = performance.now();

        // 1. Add new stimuli
        for (const stim of newStimuli) {
            // Check if we already have a memory of this source
            // Simple logic: if same tag and close position, update it
            const existing = this.stm.find(m => 
                m.stimulus.tags?.[0] === stim.tags?.[0] && 
                this.distSq(m.stimulus.position, stim.position) < 4 // 2m tolerance
            );

            if (existing) {
                existing.lastSeen = now;
                existing.stimulus.position = stim.position;
                existing.decay = 1.0;
            } else {
                this.stm.push({
                    stimulus: { ...stim }, // Clone
                    lastSeen: now,
                    decay: 1.0
                });
            }
        }

        // 2. Decay and Forget
        this.stm = this.stm.filter(m => {
            const age = now - m.lastSeen;
            m.decay = 1.0 - (age / this.STM_DURATION);
            return age < this.STM_DURATION;
        });
    }

    public getBestTarget(tags: string[]): [number, number, number] | null {
        // Find freshest/strongest memory matching tags
        let best: MemoryEntry | null = null;
        let maxScore = -1;

        for (const mem of this.stm) {
            if (mem.stimulus.tags?.some(t => tags.includes(t))) {
                const score = mem.decay * mem.stimulus.intensity;
                if (score > maxScore) {
                    maxScore = score;
                    best = mem;
                }
            }
        }

        return best ? best.stimulus.position : null;
    }

    public hasMemoryOf(tag: string): boolean {
        return this.stm.some(m => m.stimulus.tags?.includes(tag));
    }

    private distSq(p1: [number, number, number], p2: [number, number, number]): number {
        const dx = p1[0] - p2[0];
        const dy = p1[1] - p2[1];
        const dz = p1[2] - p2[2];
        return dx*dx + dy*dy + dz*dz;
    }
}
