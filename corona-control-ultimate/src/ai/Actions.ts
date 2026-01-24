import * as THREE from 'three';
import { ActionNode, NodeStatus, Blackboard } from './BehaviorTree';
import { useGameStore } from '@/stores/gameStore';

// We need access to NavMesh and Systems. 
// Assuming global access or passed via Blackboard/Context.
// For now, we use the global window access defined in App.tsx or direct imports.

export class WaitAction extends ActionNode {
    private duration: number; // seconds
    private elapsedTime: number = 0;
    private startTime: number = -1;

    constructor(blackboard: Blackboard, duration: number) {
        super(blackboard);
        this.duration = duration;
    }

    execute(): NodeStatus {
        const now = Date.now() / 1000;
        if (this.startTime === -1) {
            this.startTime = now;
        }

        if (now - this.startTime >= this.duration) {
            this.startTime = -1; // Reset
            return NodeStatus.SUCCESS;
        }

        return NodeStatus.RUNNING;
    }
}

export class MoveToAction extends ActionNode {
    private targetKey: string;
    private speed: number;
    private stopDistance: number;
    private currentPath: THREE.Vector3[] | null = null;
    private currentWaypointIdx: number = 0;
    private npcId: number;

    constructor(blackboard: Blackboard, npcId: number, targetKey: string, speed: number = 3, stopDistance: number = 1.0) {
        super(blackboard);
        this.npcId = npcId;
        this.targetKey = targetKey;
        this.speed = speed;
        this.stopDistance = stopDistance;
    }

    execute(): NodeStatus {
        const targetPos = this.blackboard.get(this.targetKey) as THREE.Vector3;
        if (!targetPos) return NodeStatus.FAILURE;

        // Get NPC current pos (Mocked/Store Access needed)
        // In a real ECS, we'd look up the component.
        // Here we use the GameStore for simplicity.
        const npc = useGameStore.getState().npcs.find(n => n.id === this.npcId);
        if (!npc) return NodeStatus.FAILURE;

        const currentPos = new THREE.Vector3(...npc.position);

        // Check distance
        if (currentPos.distanceTo(targetPos) <= this.stopDistance) {
            this.currentPath = null;
            return NodeStatus.SUCCESS;
        }

        // Pathfinding Request (First execution or recalculation)
        if (!this.currentPath) {
            const navMesh = (window as any).NavMesh;
            if (navMesh) {
                this.currentPath = navMesh.findPath(currentPos, targetPos);
                this.currentWaypointIdx = 0;
                if (!this.currentPath || this.currentPath.length === 0) return NodeStatus.FAILURE;
            } else {
                // Fallback: Direct line
                this.currentPath = [targetPos];
            }
        }

        // Follow Path
        if (this.currentWaypointIdx < this.currentPath.length) {
            const waypoint = this.currentPath[this.currentWaypointIdx];
            const direction = new THREE.Vector3().subVectors(waypoint, currentPos).normalize();

            // Move (Update Store)
            const delta = 0.016; // Approx 60fps, or use real delta from BB
            const moveAmt = direction.multiplyScalar(this.speed * delta);
            const newPos = currentPos.add(moveAmt);

            useGameStore.getState().updateNpc(this.npcId, {
                position: [newPos.x, newPos.y, newPos.z],
                rotation: Math.atan2(direction.x, direction.z)
            });

            // Check Waypoint Arrival
            if (newPos.distanceTo(waypoint) < 0.5) {
                this.currentWaypointIdx++;
            }
        } else {
            this.currentPath = null;
            return NodeStatus.SUCCESS;
        }

        return NodeStatus.RUNNING;
    }
}

export class PlayAnimationAction extends ActionNode {
    private animName: string;
    private npcId: number;

    constructor(blackboard: Blackboard, npcId: number, animName: string) {
        super(blackboard);
        this.npcId = npcId;
        this.animName = animName;
    }

    execute(): NodeStatus {
        // Trigger Animation in Store/Component
        // Simplification: Just updating state string
        useGameStore.getState().updateNpc(this.npcId, { state: this.animName });
        return NodeStatus.SUCCESS; // Return success immediately for one-shot triggers
    }
}
