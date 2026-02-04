import {
    BehaviorTreeNode,
    SelectorNode,
    SequenceNode,
    Blackboard
} from '../BehaviorTree';
import { WanderAction } from '../actions/WanderAction';
import { AttackTargetAction } from '../actions/AttackTargetAction';
import { FleeAction } from '../actions/FleeAction';
import { MoveToTargetAction } from '../actions/MoveToTargetAction';
import { PlayAnimationAction } from '../actions/PlayAnimationAction';
import { IsThreatNearCondition } from '../conditions/IsThreatNearCondition';
import { IsHealthLowCondition } from '../conditions/IsHealthLowCondition';
import * as THREE from 'three';

export class RioterBehaviorTree {
    private root: BehaviorTreeNode;
    private blackboard: Blackboard;

    constructor(blackboard: Blackboard) {
        this.blackboard = blackboard;
        this.root = this.createTree();
    }

    private createTree(): BehaviorTreeNode {
        // --- Rioter Logic ---
        // 1. Critical: Flee if health low AND threat near
        // 2. Aggressive: Attack nearby targets (Police/Player)
        // 3. Normal: Wander / Aggressive Idle

        // Self Preservation
        const retreatSequence = new SequenceNode(this.blackboard);
        retreatSequence.addChild(new IsHealthLowCondition(this.blackboard, 0.3));
        retreatSequence.addChild(new IsThreatNearCondition(this.blackboard, 20));
        retreatSequence.addChild(new PlayAnimationAction(this.blackboard, 'Run', true));
        retreatSequence.addChild(new FleeAction(this.blackboard, 40, 1.3));

        // Combat Sequence
        const combatSequence = new SequenceNode(this.blackboard);
        // Custom Condition: Has Target? (Or check threat to acquire target)
        // For simplicity, reusing IsThreatNear to trigger "Find Target" logic inside the node or simplified via 'target' blackboard check
        // Let's assume an external system or previous node sets 'target'
        // Just checking proximity for now
        combatSequence.addChild(new IsThreatNearCondition(this.blackboard, 2.0)); // Close enough to attack?
        combatSequence.addChild(new AttackTargetAction(this.blackboard, 15, 2.0, 1.5));

        // Approach Target Sequence (if threat seen but far)
        const chaseSequence = new SequenceNode(this.blackboard);
        chaseSequence.addChild(new IsThreatNearCondition(this.blackboard, 15)); // Spot threat
        // We need a custom Action to "Set Threat as Target" - simplifying by assuming MoveToTarget handles dynamic nearby threats via BB updates or we add a specific node.
        // For now, let's make them wandering aggressors
        chaseSequence.addChild(new PlayAnimationAction(this.blackboard, 'Run', true));
        chaseSequence.addChild(new MoveToTargetAction(this.blackboard, 3.5, 1.5)); // Fast approach

        // Idle/Loot Sequence
        const behaviorSequence = new SequenceNode(this.blackboard);
        behaviorSequence.addChild(new PlayAnimationAction(this.blackboard, 'Walk', true));
        behaviorSequence.addChild(new WanderAction(this.blackboard, 15, 2));

        // Root
        const root = new SelectorNode(this.blackboard);
        root.addChild(retreatSequence);
        root.addChild(combatSequence);
        // root.addChild(chaseSequence); // Needs better target acquisition logic to work without jitter
        root.addChild(behaviorSequence);

        return root;
    }

    execute() {
        this.root.execute();
    }
}
