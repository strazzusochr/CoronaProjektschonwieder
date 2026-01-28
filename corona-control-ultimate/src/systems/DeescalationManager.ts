/**
 * DeescalationManager - V6.0 Social Dynamics Engine
 * Handles relationship scores and non-violent interactions.
 */
import { useGameStore } from '@/stores/gameStore';
import * as THREE from 'three';
import AISystem from './AISystem';

class DeescalationManager {
    private static instance: DeescalationManager;
    private lastInteractionTime: number = 0;
    private readonly INTERACTION_COOLDOWN = 1000; // 1s

    private constructor() {
        console.log("🤝 DEESCALATION ENGINE ACTIVE");
    }

    public static getInstance(): DeescalationManager {
        if (!DeescalationManager.instance) {
            DeescalationManager.instance = new DeescalationManager();
        }
        return DeescalationManager.instance;
    }

    /**
     * Process a social interaction (e.g. Talk, Calm Down)
     */
    public attemptDeescalation(npcId: number, intensity: number = 10): void {
        const now = Date.now();
        if (now - this.lastInteractionTime < this.INTERACTION_COOLDOWN) return;
        this.lastInteractionTime = now;

        const npc = useGameStore.getState().npcs.find(n => n.id === npcId);
        if (!npc) return;

        // Relation-Score logic
        // If NPC is already very aggressive, deescalation is harder
        const aggressionFactor = npc.aggression || 0.5;
        const successChance = 1.0 - (aggressionFactor * 0.5);

        if (Math.random() < successChance) {
            const newScore = Math.min(100, (npc.relationshipScore || 0) + intensity);
            const newAggression = Math.max(0, aggressionFactor - (intensity / 100));

            useGameStore.getState().updateNpc(npcId, {
                relationshipScore: newScore,
                aggression: newAggression
            });

            console.log(`[Deescalation] NPC ${npcId}: Score ${newScore.toFixed(0)}, Aggression ${newAggression.toFixed(2)}`);

            // If aggression drops low enough, change state to IDLE or WALK
            if (newAggression < 0.2) {
                // Trigger AI state change if possible
                AISystem.broadcastEvent('DEESCALATED', new THREE.Vector3(...npc.position), 1);
            }
        } else {
            // Failure might increase aggression!
            const newAggression = Math.min(1.0, aggressionFactor + 0.05);
            useGameStore.getState().updateNpc(npcId, { aggression: newAggression });
            console.log(`[Deescalation] NPC ${npcId}: FAILED. Aggression increased.`);
        }
    }

    /**
     * Passive deescalation based on proximity and player "Vibe"
     * Trend scores toward neutral over time.
     */
    public passiveUpdate(delta: number): void {
        const state = useGameStore.getState();
        const npcs = state.npcs;

        // Only update a subset of NPCs per frame for performance if list is huge
        // For now, update all if list is reasonable
        npcs.forEach(npc => {
            // Passive recovery logic
            if (npc.state !== 'RIOT' && npc.state !== 'ATTACK') {
                // Recover relationship if it's negative
                if (npc.relationshipScore !== undefined && npc.relationshipScore < 0) {
                    const recovery = delta * 2.0; // 2 points per second
                    const newScore = Math.min(0, npc.relationshipScore + recovery);
                    state.updateNpc(npc.id, { relationshipScore: newScore });
                }

                // Reduce aggression
                if (npc.aggression !== undefined && npc.aggression > 0.1) {
                    const cooling = delta * 0.05; // 5% per second
                    const newAggression = Math.max(0.1, npc.aggression - cooling);
                    state.updateNpc(npc.id, { aggression: newAggression });
                }
            }
        });
    }
}

export default DeescalationManager.getInstance();
