import type { Stimulus, PerceptionConfig } from '@/types/ai';
import type { NPCData } from '@/types/npc';
import { useGameStore } from '@/stores/gameStore';
import GameEventSystem from '../GameEventSystem';

export class PerceptionSystem {
    private npc: NPCData;
    private config: PerceptionConfig;
    constructor(npc: NPCData, config: PerceptionConfig) {
        this.npc = npc;
        this.config = config;
    }

    public update(_delta: number): Stimulus[] {
        const newStimuli: Stimulus[] = [];
        const player = useGameStore.getState().player;
        
        // 1. Vision Check (Player)
        if (this.canSee(player.position)) {
            newStimuli.push({
                type: 'VISUAL',
                position: player.position,
                sourceId: 0, // Player ID
                intensity: 1.0,
                timestamp: performance.now(),
                tags: ['PLAYER']
            });
        }

        // 2. Audio Check
        const audioEvents = GameEventSystem.getInstance().getActiveStimuli(performance.now());
        for (const event of audioEvents) {
            // Distance Check
            const dx = event.position[0] - this.npc.position[0];
            const dy = event.position[1] - this.npc.position[1];
            const dz = event.position[2] - this.npc.position[2];
            const distSq = dx*dx + dy*dy + dz*dz;
            
            if (distSq < this.config.hearingRange * this.config.hearingRange) {
                newStimuli.push(event);
            }
        }

        return newStimuli;
    }

    private canSee(targetPos: [number, number, number]): boolean {
        // Distance Check
        const dx = targetPos[0] - this.npc.position[0];
        const dz = targetPos[2] - this.npc.position[2];
        const distSq = dx * dx + dz * dz;

        if (distSq > this.config.viewDistance * this.config.viewDistance) return false;

        // FOV Check
        // Normalize direction to target
        const dist = Math.sqrt(distSq);
        const dirX = dx / dist;
        const dirZ = dz / dist;

        // NPC Forward Vector (assuming rotation Y)
        // Rotation 0 = pointing +Z (or -Z? Three.js standard is usually -Z forward, but in our code we seem to use +Z or calculate it manually)
        // Let's assume standard trigonometry: angle 0 is +X? or usually -Z in 3D.
        // In NPC.tsx we used: rotation: Math.random() * Math.PI * 2
        // And movement: x + dirX, z + dirZ
        // And Math.atan2(dirX, dirZ) -> Forward vector from rotation is:
        // x = sin(rot), z = cos(rot) if 0 is North/Z+
        const forwardX = Math.sin(this.npc.rotation); 
        const forwardZ = Math.cos(this.npc.rotation);

        const dot = forwardX * dirX + forwardZ * dirZ;
        const halfFovRad = (this.config.fov / 2) * (Math.PI / 180);

        if (Math.acos(dot) > halfFovRad) return false;

        // Line of Sight Check (Raycast) - OPTIONAL/ TODO
        // For performance with 500 NPCs, we might skip this for now or do it only if in FOV.
        
        return true;
    }
}
