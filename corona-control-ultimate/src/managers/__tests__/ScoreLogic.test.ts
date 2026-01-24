import { describe, it, expect, vi } from 'vitest';
import { EndingManager } from '../EndingManager';
import { useGameStore } from '@/stores/gameStore';

describe('EndingManager', () => {
    it('should calculate Rank S for high score', () => {
        useGameStore.getState = vi.fn(() => ({
            gameState: { points: 3000, health: 100 },
            tensionLevel: 0
        })) as any;

        const result = EndingManager.calculateEnding();
        expect(result.rank).toBe('S');
    });

    it('should fail mission if health is 0', () => {
         useGameStore.getState = vi.fn(() => ({
            gameState: { points: 5000, health: 0 },
            tensionLevel: 0
        })) as any;

        const result = EndingManager.calculateEnding();
        expect(result.rank).toBe('F');
        expect(result.summary).toContain('FAILED');
    });
});
