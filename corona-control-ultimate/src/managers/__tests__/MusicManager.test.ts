
import { describe, it, expect, beforeEach, vi } from 'vitest';
import MusicManager from '../MusicManager';
import { useGameStore } from '@/stores/gameStore';

describe('MusicManager', () => {
    beforeEach(() => {
        // Reset Store
        useGameStore.setState({ tensionLevel: 0 });
        // Reset Manager State (hacky access via any or just assume start state)
        // Since it's a singleton, state persists. We might need to reset it manually if exposed, 
        // or just test transitions.
    });

    it('should start in AMBIENT state', () => {
        const manager = MusicManager.getInstance();
        // We need to expose getCurrentState or check side effects
        // I added getCurrentState to the implementation plan/code earlier.
        expect(manager.getCurrentState()).toBe('AMBIENT');
    });

    it('should switch to TENSION when tension > 40', () => {
        const manager = MusicManager.getInstance();
        useGameStore.setState({ tensionLevel: 50 });

        // Advance time (MusicManager checks every 1s)
        // We can mock Date.now or just call update with a delta and hope logic doesn't rely strictly on Date.now for the *first* check?
        // Actually it checks `now - lastCheck < 1000`. 
        // We need to mock Date.now()

        const start = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(start + 2000);

        manager.update(1);

        expect(manager.getCurrentState()).toBe('TENSION');
    });

    it('should switch to COMBAT when tension > 80', () => {
        const manager = MusicManager.getInstance();
        useGameStore.setState({ tensionLevel: 90 });

        const start = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(start + 4000); // Advance more

        manager.update(1);

        expect(manager.getCurrentState()).toBe('COMBAT');
    });
});
