import { ActionNode, NodeStatus, Blackboard } from '../BehaviorTree';
import * as THREE from 'three';

export class MoveToTargetAction extends ActionNode {
    private speed: number;
    private minDistance: number;

    constructor(blackboard: Blackboard, speed: number = 2.0, minDistance: number = 1.0) {
        super(blackboard);
        this.speed = speed;
        this.minDistance = minDistance;
    }

    execute(): NodeStatus {
        const targetPos = this.blackboard.get('targetPosition');
        const npcPosition = this.blackboard.get('position') as THREE.Vector3;
        const setVelocity = this.blackboard.get('setVelocity'); // Function to set physics velocity

        if (!targetPos || !npcPosition || !setVelocity) {
            return NodeStatus.FAILURE;
        }

        const distance = npcPosition.distanceTo(targetPos);

        if (distance < this.minDistance) {
            setVelocity(0, 0, 0); // Stop
            return NodeStatus.SUCCESS;
        }

        // Calculate direction
        const direction = new THREE.Vector3().subVectors(targetPos, npcPosition).normalize();

        // Apply velocity (simple, physics based likely handled elsewhere, but this sets intent)
        setVelocity(direction.x * this.speed, 0, direction.z * this.speed);

        // Update rotation blackboard value for the renderer to use
        this.blackboard.set('desiredRotation', Math.atan2(direction.x, direction.z));

        return NodeStatus.RUNNING;
    }
}
