import { StateMachine } from './StateMachine';
import type { NPCData } from '@/types/npc';
import { MemorySystem } from './MemorySystem';
import type { Stimulus } from '@/types/ai';
import { PerceptionSystem } from './PerceptionSystem';
import CrowdSystem from '../CrowdSystem';
import { UtilityBrain } from './UtilitySystem';
import { FlowFieldSystem } from '../FlowFieldSystem';

export abstract class AIController {
    protected npc: NPCData;
    protected stateMachine: StateMachine;
    protected perception: PerceptionSystem;
    public memory: MemorySystem;
    public brain: UtilityBrain;
    
    // Perception Cache
    protected lastPlayerPos: [number, number, number] | null = null;
    protected distanceToPlayer: number = Infinity;
    protected activeStimuli: Stimulus[] = [];

    constructor(npc: NPCData) {
        this.npc = npc;
        this.stateMachine = new StateMachine(this);
        this.memory = new MemorySystem();
        this.brain = new UtilityBrain();
        
        // Default Config based on type
        this.perception = new PerceptionSystem(npc, {
            fov: 120,
            viewDistance: npc.type === 'RIOTER' ? 30 : 20,
            hearingRange: 20,
            reactionTime: 200
        });
    }

    public update(delta: number, _playerPos?: [number, number, number] | number[]) {
        // Perception Update
        this.activeStimuli = this.perception.update(delta);
        
        // Memory Update
        this.memory.update(delta, this.activeStimuli);

        // Process Stimuli (Sync to legacy vars for now)
        for (const stim of this.activeStimuli) {
            if (stim.tags?.includes('PLAYER')) {
                this.lastPlayerPos = stim.position;
                // Recalc distance for backwards compatibility / utility
                const dx = this.lastPlayerPos[0] - this.npc.position[0];
                const dz = this.lastPlayerPos[2] - this.npc.position[2];
                this.distanceToPlayer = Math.sqrt(dx*dx + dz*dz);
            }
        }
        
        // FSM Update
        this.stateMachine.update(delta);

        // CROWD SIMULATION: BOIDS (Separation, Cohesion, Alignment)
        // Tune these weights for different behaviors
        const separationWeight = 2.5;
        const alignmentWeight = 1.0;
        const cohesionWeight = 1.0;

        const neighbors = CrowdSystem.getInstance().getNeighbors(this.npc.position[0], this.npc.position[2], 3.0); // 3m radius for flocking
        
        let sepX = 0, sepZ = 0;
        let alignX = 0, alignZ = 0;
        let cohX = 0, cohZ = 0;
        let count = 0;

        for (const n of neighbors) {
            if (n.id === this.npc.id) continue;

            const dx = this.npc.position[0] - n.x;
            const dz = this.npc.position[2] - n.z;
            const distSq = dx*dx + dz*dz;

            if (distSq < 0.0001 || distSq > 9) continue;

            const dist = Math.sqrt(distSq);

            // Separation: Push away (inverse distance)
            if (dist < 1.0) { // Only separate if very close
               const strength = (1.0 - dist) * 2.0;
               sepX += (dx / dist) * strength;
               sepZ += (dz / dist) * strength;
            }

            // Alignment: Match velocity
            if (n.vx !== undefined && n.vz !== undefined) {
                alignX += n.vx;
                alignZ += n.vz;
            }

            // Cohesion: Move to average position
            cohX += n.x;
            cohZ += n.z;
            
            count++;
        }

        if (count > 0) {
            // Alignment Average
            alignX /= count;
            alignZ /= count;
            // Normalize Alignment (optional, creates consistent force)
            
            // Cohesion Average - My Position = Direction to Center
            cohX = (cohX / count) - this.npc.position[0];
            cohZ = (cohZ / count) - this.npc.position[2];

            // Apply Forces
            // Current approach modifies position directly (Kinematic simulation)
            // A better way would be modifying velocity, but since we control position:
            
            let moveX = (sepX * separationWeight) + (alignX * alignmentWeight * 0.1) + (cohX * cohesionWeight * 0.05);
            let moveZ = (sepZ * separationWeight) + (alignZ * alignmentWeight * 0.1) + (cohZ * cohesionWeight * 0.05);

            // Damping / Max Speed Clamp for crowd forces
            const lenSq = moveX*moveX + moveZ*moveZ;
            if (lenSq > 1.0) {
                 const len = Math.sqrt(lenSq);
                 moveX = (moveX / len);
                 moveZ = (moveZ / len);
            }

            this.npc.position[0] += moveX * delta * 2.0;
            this.npc.position[2] += moveZ * delta * 2.0;
        }
    }

    public getData(): NPCData {
        return this.npc;
    }

    // Helper für States
    public moveTo(target: [number, number, number], speed: number, delta: number): boolean {
        const dx = target[0] - this.npc.position[0];
        const dz = target[2] - this.npc.position[2];
        const dist = Math.sqrt(dx*dx + dz*dz);

        if (dist < 0.5) return true; // Reached

        const moveStep = speed * delta;
        
        let dirX = dx / dist;
        let dirZ = dz / dist;
        
        // Flow Field Check for Obstacle Avoidance
        const flow = FlowFieldSystem.getInstance().getFlowVector(this.npc.position[0], this.npc.position[2]);
        if (flow.x !== 0 || flow.y !== 0) {
            // If we have a flow vector (meaning we are in a calculated field), assume it guides us around obstacles
            // We blend: 70% Flow Field, 30% Direct Target
            const blend = 0.7;
            dirX = (dirX * (1 - blend)) + (flow.x * blend);
            dirZ = (dirZ * (1 - blend)) + (flow.y * blend);
            
            // Re-normalize
            const len = Math.sqrt(dirX*dirX + dirZ*dirZ);
            if (len > 0.001) {
                dirX /= len;
                dirZ /= len;
            }
        }

        this.npc.position = [
            this.npc.position[0] + dirX * moveStep,
            this.npc.position[1],
            this.npc.position[2] + dirZ * moveStep
        ];

        // Rotate towards target
        const targetRotation = Math.atan2(dirX, dirZ);
        let rotDiff = targetRotation - this.npc.rotation;
        if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        this.npc.rotation += rotDiff * 5 * delta;

        return false; // Not reached yet
    }
}
