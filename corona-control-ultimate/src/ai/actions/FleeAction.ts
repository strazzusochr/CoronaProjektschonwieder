import { ActionNode, NodeStatus, Blackboard } from '../BehaviorTree';
import * as THREE from 'three';

export class FleeAction extends ActionNode {
    private fleeDistance: number;
    private speedMultiplier: number;

    constructor(blackboard: Blackboard, fleeDistance: number = 20, speedMultiplier: number = 1.5) {
        super(blackboard);
        this.fleeDistance = fleeDistance;
        this.speedMultiplier = speedMultiplier;
    }

    execute(): NodeStatus {
        const threats = this.blackboard.get('nearbyThreats') as THREE.Vector3[];
        const npcPos = this.blackboard.get('position') as THREE.Vector3;
        const setVelocity = this.blackboard.get('setVelocity');

        if (!threats || threats.length === 0 || !setVelocity) {
            return NodeStatus.SUCCESS; // No threats to flee from
        }

        // Find closest threat
        let closestThreat: THREE.Vector3 | null = null;
        let minDist = Infinity;

        for (const threat of threats) {
            // threat might be object or vector
            const tPos = (threat as any).position || threat;
            const dist = npcPos.distanceTo(tPos);
            if (dist < minDist) {
                minDist = dist;
                closestThreat = tPos;
            }
        }

        if (!closestThreat || minDist > this.fleeDistance) {
            setVelocity(0, 0, 0);
            return NodeStatus.SUCCESS; // Far enough away
        }

        // Run away! (Opposite direction)
        const direction = new THREE.Vector3().subVectors(npcPos, closestThreat).normalize();

        // Add some jitter so they don't run in straight lines perfectly
        direction.x += (Math.random() - 0.5) * 0.2;
        direction.z += (Math.random() - 0.5) * 0.2;
        direction.normalize();

        setVelocity(direction.x * 2.5 * this.speedMultiplier, 0, direction.z * 2.5 * this.speedMultiplier);
        this.blackboard.set('desiredRotation', Math.atan2(direction.x, direction.z));
        const setAnim = this.blackboard.get('setAnimation');
        if (setAnim) setAnim('Run', true); // Force run animation

        return NodeStatus.RUNNING;
    }
}
