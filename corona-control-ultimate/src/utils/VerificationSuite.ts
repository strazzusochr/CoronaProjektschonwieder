import { useGameStore } from '@/stores/gameStore';
import CombatSystem from '@/systems/CombatSystem';
import TimeSystem from '@/systems/TimeSystem';

export class VerificationSuite {
    static async runAllTests() {
        console.group('🔍 VERIFICATION SUITE STARTING...');
        const results: Record<string, boolean> = {};

        try {
            // 1. Time Progression Test
            console.log('⏱️ Testing Time Progression...');
            const startTime = useGameStore.getState().gameState.dayTime;
            await new Promise(r => setTimeout(r, 2000)); // Wait 2s
            const endTime = useGameStore.getState().gameState.dayTime;
            results['Time_Progression'] = endTime > startTime;
            console.log(`Checking Time: Start=${startTime}, End=${endTime} -> ${results['Time_Progression'] ? 'PASS' : 'FAIL'}`);

            // 2. Inventory Logic
            console.log('🎒 Testing Inventory...');
            // const initialInv = useGameStore.getState().inventory[0].item;
            useGameStore.getState().addItem({ id: 'test_item', name: 'Test Item', type: 'CONSUMABLE', description: 'Test', maxStack: 1, quantity: 1 });
            const hasItem = useGameStore.getState().inventory.some(slot => slot.item?.id === 'test_item');
            results['Inventory_Add'] = hasItem;
            console.log(`Inventory Add: ${hasItem ? 'PASS' : 'FAIL'}`);

            // 3. Combat / Physics (Spawn)
            console.log('🔥 Testing Combat System...');
            const initialProjCount = CombatSystem.getProjectiles().length;
            CombatSystem.spawnProjectile('MOLOTOV', [0, 10, 0], [0, 0, 0], 'PLAYER');
            const newProjCount = CombatSystem.getProjectiles().length;
            results['Projectile_Spawn'] = newProjCount > initialProjCount;
            console.log(`Projectile Spawn: ${initialProjCount} -> ${newProjCount} -> ${results['Projectile_Spawn'] ? 'PASS' : 'FAIL'}`);

            // 4. Tension / Global State
            console.log('⚠️ Testing Tension...');
            const startTension = useGameStore.getState().tensionLevel;
            useGameStore.getState().setTension(50);
            const setTension = useGameStore.getState().tensionLevel;
            results['Tension_Set'] = setTension === 50;
            console.log(`Tension Set: ${startTension} -> ${setTension} -> ${results['Tension_Set'] ? 'PASS' : 'FAIL'}`);

            // 5. Final Report
            console.groupEnd();
            const allPassed = Object.values(results).every(v => v);
            console.log(`%c🏁 VERIFICATION COMPLETE: ${allPassed ? 'ALL PASSED' : 'FAILURES DETECTED'}`,
                allPassed ? 'color: green; font-size: 16px; font-weight: bold;' : 'color: red; font-size: 16px; font-weight: bold;');
            console.table(results);

            return allPassed;
        } catch (e) {
            console.error('VERIFICATION CRASHED:', e);
            return false;
        }
    }
}

// Expose to window for browser agent to call
(window as any).VerificationSuite = VerificationSuite;
