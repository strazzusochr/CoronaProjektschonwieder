import { ActionNode, NodeStatus, Blackboard } from '../BehaviorTree';
import * as THREE from 'three';

export class WanderAction extends ActionNode {
    private radius: number;
    private waitTime: number;
    private lastWanderTime: number = 0;
    private currentTarget: THREE.Vector3 | null = null;
    private moveNode: ActionNode | null = null;

    constructor(blackboard: Blackboard, radius: number = 10, waitTime: number = 5) {
        super(blackboard);
        this.radius = radius;
        this.waitTime = waitTime;
    }

    execute(): NodeStatus {
        const currentTime = Date.now() / 1000;
        const npcPos = this.blackboard.get('position') as THREE.Vector3;

        if (!this.currentTarget && (currentTime - this.lastWanderTime > this.waitTime)) {
            // Pick new random point
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * this.radius;
            this.currentTarget = new THREE.Vector3(
                npcPos.x + Math.sin(angle) * dist,
                npcPos.y,
                npcPos.z + Math.cos(angle) * dist
            );

            // Set for MoveToNode to consume if we were composing, but here we do it directly or via blackboard
            this.blackboard.set('targetPosition', this.currentTarget);
            this.lastWanderTime = currentTime;
        }

        if (this.currentTarget) {
            // Logic similar to MoveTo, or delegate? 
            // Better to keep it simple: Check if valid path, set velocity
            const distance = npcPos.distanceTo(this.currentTarget);
            const setVelocity = this.blackboard.get('setVelocity');

            if (distance < 1.0) {
                setVelocity(0, 0, 0);
                this.currentTarget = null; // Done wandering to this point
                return NodeStatus.SUCCESS;
            }

            const direction = new THREE.Vector3().subVectors(this.currentTarget, npcPos).normalize();
            setVelocity(direction.x * 1.5, 0, direction.z * 1.5); // Slower wander speed
            this.blackboard.set('desiredRotation', Math.atan2(direction.x, direction.z));

            return NodeStatus.RUNNING;
        }

        return NodeStatus.SUCCESS; // Idle waiting for next wander time
    }
}
