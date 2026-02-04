import {
    BehaviorTreeNode,
    SelectorNode,
    SequenceNode,
    Blackboard
} from '../BehaviorTree';
import { WanderAction } from '../actions/WanderAction';
import { WaitAction } from '../actions/WaitAction';
import { FleeAction } from '../actions/FleeAction';
import { PlayAnimationAction } from '../actions/PlayAnimationAction';
import { IsThreatNearCondition } from '../conditions/IsThreatNearCondition';

export class CivilianBehaviorTree {
    private root: BehaviorTreeNode;
    private blackboard: Blackboard;

    constructor(blackboard: Blackboard) {
        this.blackboard = blackboard;
        this.root = this.createTree();
    }

    private createTree(): BehaviorTreeNode {
        // --- Civilian Logic ---
        // 1. Critical: Flee if threat is near
        // 2. Normal: Wander around, stop and look occasionally

        // Flee Sequence
        const fleeSequence = new SequenceNode(this.blackboard);
        fleeSequence.addChild(new IsThreatNearCondition(this.blackboard, 15)); // 15m danger radius
        fleeSequence.addChild(new PlayAnimationAction(this.blackboard, 'Run', true)); // Ensure running anim
        fleeSequence.addChild(new FleeAction(this.blackboard, 30, 1.2)); // Run 30m away, 1.2x speed

        // Wander Sequence
        const wanderSequence = new SequenceNode(this.blackboard);
        wanderSequence.addChild(new PlayAnimationAction(this.blackboard, 'Walk', true));
        wanderSequence.addChild(new WanderAction(this.blackboard, 20, 3)); // 20m radius, wait 3s

        // Root Selector (Priority)
        const root = new SelectorNode(this.blackboard);
        root.addChild(fleeSequence);   // High Priority
        root.addChild(wanderSequence); // Low Priority

        return root;
    }

    execute() {
        this.root.execute();
    }
}
