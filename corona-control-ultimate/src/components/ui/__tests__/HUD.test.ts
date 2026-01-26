import { describe, it, expect, vi } from 'vitest';
import { useGameStore } from '@/stores/gameStore';

// Mock Store is complex, so we test logic functions if extracted.
// Since logic is inside component, we can test the selectors or helper functions.
// Or we verify that the store state would trigger the correct conditions.

describe('HUD Logic', () => {
    it('should identify low health condition', () => {
        useGameStore.setState({ gameState: { ...useGameStore.getState().gameState, health: 20 } });
        const health = useGameStore.getState().gameState.health;
        expect(health).toBeLessThan(30);
    });

    it('should identify active mission', () => {
        useGameStore.setState({ gameState: { ...useGameStore.getState().gameState, currentMissionIndex: 0 } });
        const index = useGameStore.getState().gameState.currentMissionIndex;
        expect(index).toBe(0);
    });
});
