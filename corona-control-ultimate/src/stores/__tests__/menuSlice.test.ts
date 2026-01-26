import { describe, it, expect } from 'vitest';
import { useGameStore } from '@/stores/gameStore';

describe('Game Menu Slice', () => {
    it('should start in MAIN menu state', () => {
        const state = useGameStore.getState().gameState;
        expect(state.menuState).toBe('MAIN');
        expect(state.isPlaying).toBe(false);
    });

    it('should switch to PLAYING when starting game', () => {
        useGameStore.getState().startGame();
        const state = useGameStore.getState().gameState;
        expect(state.menuState).toBe('PLAYING');
        expect(state.isPlaying).toBe(true);
    });

    it('should return to MAIN when resetting game', () => {
        useGameStore.getState().resetGame();
        const state = useGameStore.getState().gameState;
        expect(state.menuState).toBe('MAIN');
        expect(state.isPlaying).toBe(false);
    });
});
