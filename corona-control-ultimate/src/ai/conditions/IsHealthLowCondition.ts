import { ConditionalNode, Blackboard } from '../BehaviorTree';

export class IsHealthLowCondition extends ConditionalNode {
    constructor(blackboard: Blackboard, private thresholdRatio: number = 0.3) {
        super(blackboard, (bb) => {
            const health = bb.get('health') as number;
            const maxHealth = bb.get('maxHealth') as number;

            if (health === undefined || maxHealth === undefined) return false;

            return (health / maxHealth) < this.thresholdRatio;
        });
    }
}
