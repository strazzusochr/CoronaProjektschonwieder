import { describe, it, expect, beforeEach, vi } from 'vitest';
import CombatSystem from '../CombatSystem';
import * as THREE from 'three';

// Mock store access if necessary (CombatSystem might access it directly)
// Ideally pass dependencies, but for singleton we might need to mock import
vi.mock('@/stores/gameStore', () => ({
    useGameStore: {
        getState: () => ({
            setPrompt: vi.fn(), // Required by handleImpact
            setTension: vi.fn(),
        })
    }
}));

describe('CombatSystem', () => {
    beforeEach(() => {
        // Reset singleton state
        (CombatSystem as any).projectiles = [];
    });

    it('should spawn a projectile', () => {
        CombatSystem.spawnProjectile('MOLOTOV', [0, 10, 0], [0, 0, 1], 'PLAYER');
        expect((CombatSystem as any).projectiles.length).toBe(1);

        const proj = (CombatSystem as any).projectiles[0];
        expect(proj.type).toBe('MOLOTOV');
        expect(proj.position).toEqual([0, 10, 0]);
        expect(proj.velocity).toEqual([0, 0, 1]);
    });

    it('should apply gravity during update', () => {
        CombatSystem.spawnProjectile('MOLOTOV', [100, 100, 100], [0, 0, 0], 'PLAYER');
        const proj = (CombatSystem as any).projectiles[0];

        const initialY = proj.position[1];
        CombatSystem.update(0.1); // 100ms

        // y should decrease due to gravity (-9.81)
        expect(proj.position[1]).toBeLessThan(initialY);
        // vy should be approx -9.81 * 0.1
        expect(proj.velocity[1]).toBeCloseTo(-0.981, 2);
    });

    it('should handle ground collision (basic check)', () => {
        CombatSystem.spawnProjectile('MOLOTOV', [0, 0.1, 0], [0, -10, 0], 'PLAYER');
        const proj = (CombatSystem as any).projectiles[0];

        // Update enough to hit ground (y <= 0.1)
        CombatSystem.update(0.1);

        // Should be inactive or removed
        // The loop filters inactive projectiles at the end of update
        // So checking if it is still in the array is the way
        const remaining = (CombatSystem as any).projectiles;
        // Logic: handleImpact sets active=false, then filter removes it.
        // So length should be 0.
        expect(remaining.length).toBe(0);
    });
});
