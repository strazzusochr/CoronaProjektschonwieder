import * as THREE from 'three';
import { Blackboard, SelectorNode, SequenceNode, ConditionalNode, InverterNode, ActionNode, NodeStatus } from './BehaviorTree';
import { MoveToAction, PlayAnimationAction, WaitAction } from './Actions';

export class TreeFactory {
    static createGuardPatrolTree(npcId: number, patrolPoints: THREE.Vector3[]): SelectorNode {
        const bb = new Blackboard();
        bb.set('patrolPoints', patrolPoints);
        bb.set('currentPatrolIndex', 0);
        bb.set('playerPos', null); // Should be updated by Perception System

        const root = new SelectorNode(bb);

        // 1. Combat/Chase (Higher Priority - Placeholder for now)
        // Would add Condition: PlayerVisible and Action: Attack

        // 2. Patrol Sequence
        const patrolSequence = new SequenceNode(bb);

        // Define Custom Action: GetNextPatrolPoint
        const getNextPoint = new class extends ActionNode {
            execute() {
                const points = this.blackboard.get('patrolPoints') as THREE.Vector3[];
                let idx = this.blackboard.get('currentPatrolIndex');

                this.blackboard.set('targetPos', points[idx]);

                idx = (idx + 1) % points.length;
                this.blackboard.set('currentPatrolIndex', idx);

                return NodeStatus.SUCCESS;
            }
        }(bb);

        patrolSequence.addChild(getNextPoint);
        patrolSequence.addChild(new MoveToAction(bb, npcId, 'targetPos', 3.0));
        patrolSequence.addChild(new PlayAnimationAction(bb, npcId, 'IDLE')); // Look around
        patrolSequence.addChild(new WaitAction(bb, 3.0)); // Wait 3s

        root.addChild(patrolSequence);

        return root;
    }
}
