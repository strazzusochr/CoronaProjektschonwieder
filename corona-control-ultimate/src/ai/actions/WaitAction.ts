import { ActionNode, NodeStatus, Blackboard } from '../BehaviorTree';

export class WaitAction extends ActionNode {
    private duration: number;
    private startTime: number = -1;

    constructor(blackboard: Blackboard, duration: number) {
        super(blackboard);
        this.duration = duration;
    }

    execute(): NodeStatus {
        if (this.startTime === -1) {
            this.startTime = Date.now() / 1000;
        }

        if ((Date.now() / 1000) - this.startTime > this.duration) {
            this.startTime = -1; // Reset for next run
            return NodeStatus.SUCCESS;
        }

        return NodeStatus.RUNNING;
    }
}
