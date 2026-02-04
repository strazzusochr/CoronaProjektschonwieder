import {
    BehaviorTreeNode,
    SelectorNode,
    SequenceNode,
    Blackboard
} from '../BehaviorTree';
import { WaitAction } from '../actions/WaitAction';
import { MoveToTargetAction } from '../actions/MoveToTargetAction';
import { AttackTargetAction } from '../actions/AttackTargetAction';
import { PlayAnimationAction } from '../actions/PlayAnimationAction';
import { IsThreatNearCondition } from '../conditions/IsThreatNearCondition';

export class PoliceBehaviorTree {
    private root: BehaviorTreeNode;
    private blackboard: Blackboard;

    constructor(blackboard: Blackboard) {
        this.blackboard = blackboard;
        this.root = this.createTree();
    }

    private createTree(): BehaviorTreeNode {
        // --- Police Logic ---
        // 1. Formation: If assigned position, move there and hold.
        // 2. Engagement: If Order=CHARGE, move to target/rioter.
        // 3. Defense: If Threat near, Block/Attack.

        // Formation Logic (High Priority if Order is valid)
        const holdLineSequence = new SequenceNode(this.blackboard);
        // Condition: Has Formation Target?
        // Mock with simple MoveTo if 'formationPos' exists
        // simplified for now:
        // Checking for "Hold" order
        // holdLineSequence.addChild(new CheckOrderCondition('HOLD')); 
        // holdLineSequence.addChild(new MoveToTargetAction(bb, 2.0));
        // holdLineSequence.addChild(new PlayAnimationAction(bb, 'ShieldIdle'));

        // Combat/Arrest
        const arrestSequence = new SequenceNode(this.blackboard);
        arrestSequence.addChild(new IsThreatNearCondition(this.blackboard, 1.5));
        arrestSequence.addChild(new AttackTargetAction(this.blackboard, 5, 1.5, 1.0)); // Batons do less dmg but fast?

        // Patrol/Guard
        const patrolSequence = new SequenceNode(this.blackboard);
        patrolSequence.addChild(new PlayAnimationAction(this.blackboard, 'Walk', true));
        // Patrol Logic could be complex, using simple wait for now as "Guard"
        patrolSequence.addChild(new WaitAction(this.blackboard, 2.0));

        // Root
        const root = new SelectorNode(this.blackboard);
        root.addChild(arrestSequence); // Immediate threat response
        root.addChild(patrolSequence); // Fallback

        return root;
    }

    execute() {
        this.root.execute();
    }
}
