import { ActionNode, NodeStatus, Blackboard } from '../BehaviorTree';
import * as THREE from 'three';

export class AttackTargetAction extends ActionNode {
    private damage: number;
    private range: number;
    private cooldown: number;
    private lastAttackTime: number = 0;

    constructor(blackboard: Blackboard, damage: number = 10, range: number = 1.5, cooldown: number = 1.0) {
        super(blackboard);
        this.damage = damage;
        this.range = range;
        this.cooldown = cooldown;
    }

    execute(): NodeStatus {
        const target = this.blackboard.get('target') as any; // Expecting object with position
        const npcPos = this.blackboard.get('position') as THREE.Vector3;
        const currentTime = Date.now() / 1000;

        if (!target) return NodeStatus.FAILURE;

        // Check range
        const targetPos = target.position || target; // Handle Vector3 or Object
        if (npcPos.distanceTo(targetPos) > this.range) {
            return NodeStatus.FAILURE; // Too far
        }

        // Check cooldown
        if (currentTime - this.lastAttackTime < this.cooldown) {
            return NodeStatus.RUNNING; // Waiting for cooldown
        }

        // Perform Attack
        this.lastAttackTime = currentTime;

        // Trigger visual
        const setAnimation = this.blackboard.get('setAnimation');
        if (setAnimation) setAnimation('Punch', false);

        // Apply Damage (via callback)
        const onAttack = this.blackboard.get('onAttack');
        if (onAttack) onAttack(target, this.damage);

        return NodeStatus.SUCCESS;
    }
}
