import { AIController } from './AIController';
import { IdleState, WanderState, AttackState, PanicState } from './states/BasicStates';
import type { NPCData } from '@/types/npc';
import { useGameStore } from '@/stores/gameStore';

import { UtilityCurve } from './UtilitySystem';

export class CivilianController extends AIController {
    constructor(npc: NPCData) {
        super(npc);
        this.stateMachine.changeState(new IdleState());

        // --- Setup Utility Brain ---

        // Action: FLEE / PANIC
        this.brain.addAction({
            name: 'PANIC',
            weight: 1.0,
            execute: () => {
                if (this.stateMachine.getCurrentStateName() !== 'PANIC') {
                    this.stateMachine.changeState(new PanicState());
                }
            },
            considerations: [
                {
                    name: 'ThreatDistance',
                    weight: 2.0,
                    curve: new UtilityCurve('EXPONENTIAL', 1, 2), // High reaction at close range
                    getValue: () => {
                        // Normalize distance: 0m = 1.0 (High danger), 30m = 0.0 (Safe)
                        const maxDist = 30;
                        const dist = this.distanceToPlayer;
                        return Math.max(0, 1 - (dist / maxDist));
                    }
                },
                {
                    name: 'TensionLevel',
                    weight: 1.0,
                    curve: new UtilityCurve('LINEAR'),
                    getValue: () => {
                        return useGameStore.getState().tensionLevel / 100;
                    }
                }
            ]
        });

        // Action: WANDER
        this.brain.addAction({
            name: 'WANDER',
            weight: 0.5, // Lower base priority
            execute: () => {
                // Determine if we should wander or idle randomly if safe
                if (this.stateMachine.getCurrentStateName() !== 'WANDER' && this.stateMachine.getCurrentStateName() !== 'IDLE') {
                    this.stateMachine.changeState(new WanderState());
                } else if (this.stateMachine.getCurrentStateName() === 'IDLE' && Math.random() < 0.01) {
                    this.stateMachine.changeState(new WanderState());
                }
            },
            considerations: [
                {
                    name: 'Safety',
                    weight: 1.5,
                    curve: new UtilityCurve('SIGMOID'),
                    getValue: () => {
                        // Safe if far from threats
                        const maxDist = 30;
                        const dist = this.distanceToPlayer;
                        return Math.min(1, dist / maxDist);
                    }
                }
            ]
        });
    }

    public update(delta: number, playerPos?: [number, number, number] | number[]) {
        super.update(delta, playerPos);

        // Radicalization Logic (Keep hardcoded for now as it's a permanent state change)
        const store = useGameStore.getState();
        const tension = store.tensionLevel;

        if (tension > 80) {
            const threshold = 0.0005 * (tension - 80);
            if (Math.random() < threshold) {
                console.log(`Civilian ${this.npc.id} radicalized!`);
                store.updateNpc(this.npc.id, { type: 'RIOTER' });
                return;
            }
        }

        // --- Utility Decision ---
        // Run brain every few frames to save perf, or every frame for responsiveness
        // For 500 NPCs, we should interleave. But for now, simple every frame check (math is cheap)

        const bestAction = this.brain.decide();
        if (bestAction) {
            // console.log(`NPC ${this.npc.id} chose ${bestAction.name}`);
            bestAction.execute();
        }
    }
}

export class RioterController extends AIController {
    constructor(npc: NPCData) {
        super(npc);
        this.stateMachine.changeState(new WanderState()); // Rioter sind unruhig
    }

    public update(delta: number, playerPos?: [number, number, number] | number[]) {
        super.update(delta, playerPos);

        // Rioter Specific High-Level Logic Overshield
        // Aggressiverer State Change Check
        const tension = useGameStore.getState().tensionLevel;
        const aggressionRange = 15 + (tension * 0.3); // 15m (0%) -> 45m (100%)

        if (this.distanceToPlayer < aggressionRange && this.stateMachine.getCurrentStateName() !== 'ATTACK') {
            this.stateMachine.changeState(new AttackState());
        }
    }
}

