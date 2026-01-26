import { describe, it, expect, vi, beforeEach } from 'vitest';
import CombatSystem from '../CombatSystem';
import { useGameStore } from '@/stores/gameStore';

// Mock GameStore
vi.mock('@/stores/gameStore', () => ({
    useGameStore: {
        getState: vi.fn(() => ({
            setPrompt: vi.fn(),
        })),
    },
}));

describe('CombatSystem', () => {
    beforeEach(() => {
        // Reset projectiles (hacky since it's a singleton, but we can clear via public method if we had one, or just spawn new ones)
        // Since we can't easily clear private array, we just ignore previous ones or assume test isolation if we recreated the instance.
        // But it's a singleton export.
        // Let's just test the flow.
    });

    it('should spawn a projectile and notify listeners', () => {
        const listener = vi.fn();
        const unsubscribe = CombatSystem.subscribe(listener);

        CombatSystem.spawnProjectile('STONE', [0, 0, 0], [1, 0, 0], 'PLAYER');

        expect(listener).toHaveBeenCalled();
        const projectiles = CombatSystem.getProjectiles();
        expect(projectiles.length).toBeGreaterThan(0);
        expect(projectiles[projectiles.length - 1].type).toBe('STONE');

        unsubscribe();
    });

    it('should handle impact and remove projectile', () => {
        const listener = vi.fn();
        CombatSystem.subscribe(listener);

        CombatSystem.spawnProjectile('MOLOTOV', [0, 10, 0], [0, -1, 0], 'PLAYER');
        const projectiles = CombatSystem.getProjectiles();
        const id = projectiles[projectiles.length - 1].id;

        CombatSystem.handleImpact(id, [0, 0, 0]);

        expect(listener).toHaveBeenCalledTimes(2); // Spawn + Impact

        // Should be removed
        const active = CombatSystem.getProjectiles().find(p => p.id === id);
        expect(active).toBeUndefined();
    });
});
