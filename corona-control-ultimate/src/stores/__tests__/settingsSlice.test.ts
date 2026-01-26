import { describe, it, expect } from 'vitest';
import { useGameStore } from '@/stores/gameStore';

describe('Settings Slice Integration', () => {
    it('should open settings and track previous menu', () => {
        useGameStore.getState().resetGame();
        useGameStore.getState().openSettings();

        const state = useGameStore.getState().gameState;
        expect(state.menuState).toBe('SETTINGS');
        expect(state.previousMenuState).toBe('MAIN');
        expect(state.isPlaying).toBe(false);
    });

    it('should close settings and return to previous menu', () => {
        // Ensure we are in settings
        if (useGameStore.getState().gameState.menuState !== 'SETTINGS') {
            useGameStore.getState().openSettings();
        }

        useGameStore.getState().closeSettings();

        const state = useGameStore.getState().gameState;
        expect(state.menuState).toBe('MAIN');
    });

    it('should handle pause menu transitions correctly', () => {
        useGameStore.getState().startGame();
        // Simulate pause
        useGameStore.setState(s => ({
            gameState: { ...s.gameState, menuState: 'PAUSED', isPlaying: false }
        }));

        useGameStore.getState().openSettings();
        expect(useGameStore.getState().gameState.previousMenuState).toBe('PAUSED');

        useGameStore.getState().closeSettings();
        expect(useGameStore.getState().gameState.menuState).toBe('PAUSED');
    });
});
