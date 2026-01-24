import { describe, it, expect, beforeEach, vi } from 'vitest';
import TensionManager from '../TensionManager';
import { useGameStore } from '@/stores/gameStore';

// Mock Store
const tensionSetter = vi.fn();
vi.mock('@/stores/gameStore', () => ({
    useGameStore: {
        getState: vi.fn(() => ({
            tensionLevel: 50,
            setTension: tensionSetter,
            spawnWave: vi.fn(),
            setPrompt: vi.fn()
        }))
    }
}));

describe('TensionManager', () => {
    beforeEach(() => {
        tensionSetter.mockClear();
    });

    it('should be a singleton', () => {
        const instance1 = TensionManager.getInstance();
        const instance2 = TensionManager.getInstance();
        expect(instance1).toBe(instance2);
    });

    it.skip('should decay tension overtime (DEPRECATED: Moved to TensionSystem)', () => {
        const manager = TensionManager.getInstance();
        // Mock current tension 50, delta 1000ms (1s)
        // Decay Rate is 0.5 per sec.
        // Expected: 50 - 0.5 = 49.5

        manager.update(1.0, 1000);

        // Check if setTension was called with lower value
        expect(tensionSetter).toHaveBeenCalled();
        const callArg = tensionSetter.mock.calls[0][0];
        expect(callArg).toBeLessThan(50);
    });
});
