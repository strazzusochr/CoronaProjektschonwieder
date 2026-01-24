import { describe, it, expect, beforeEach, vi } from 'vitest';
import TensionSystem from '../TensionSystem';
import { useGameStore } from '@/stores/gameStore';

// Mock Store
const tensionSetter = vi.fn();
const waveSpawner = vi.fn();

vi.mock('@/stores/gameStore', () => ({
    useGameStore: {
        getState: vi.fn(() => ({
            tensionLevel: 50,
            setTension: tensionSetter,
            spawnWave: waveSpawner,
            setPrompt: vi.fn(),
            activeQuests: [] // Mock other needed properties
        }))
    }
}));

describe('TensionSystem', () => {
    beforeEach(() => {
        tensionSetter.mockClear();
        waveSpawner.mockClear();
        // Reset singleton state if accessible or needed
        // TensionSystem stores state in store, so mocking store is mostly enough, 
        // but it has `lastWaveTime`. Ideally we'd reset that.
    });

    it('should decay tension over time', () => {
        // Mock store state returning 50
        vi.mocked(useGameStore.getState).mockReturnValue({
            tensionLevel: 50,
            setTension: tensionSetter
        } as any);

        // Update with 1.0 second delta
        TensionSystem.update(1.0);

        // Expect setTension to be called with slightly less than 50
        // Decay rate is typically 0.5/sec
        expect(tensionSetter).toHaveBeenCalled();
        const callArg = tensionSetter.mock.calls[0][0];
        expect(callArg).toBeLessThan(50);
        expect(callArg).toBeCloseTo(49.5, 1);
    });

    it('should not decay below 0', () => {
        vi.mocked(useGameStore.getState).mockReturnValue({
            tensionLevel: 0.1,
            setTension: tensionSetter
        } as any);

        TensionSystem.update(1.0); // Should decay 0.5 -> would be -0.4

        expect(tensionSetter).toHaveBeenCalled();
        expect(tensionSetter.mock.calls[0][0]).toBeGreaterThanOrEqual(0);
    });
});
