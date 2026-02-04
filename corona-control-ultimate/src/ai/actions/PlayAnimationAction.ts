import { ActionNode, NodeStatus, Blackboard } from '../BehaviorTree';

export class PlayAnimationAction extends ActionNode {
    private animationName: string;
    private loop: boolean;
    private blocking: boolean;

    constructor(blackboard: Blackboard, animationName: string, loop: boolean = false, blocking: boolean = false) {
        super(blackboard);
        this.animationName = animationName;
        this.loop = loop;
        this.blocking = blocking; // If true, wait until animation finishes (rough approximation)
    }

    execute(): NodeStatus {
        const setAnimation = this.blackboard.get('setAnimation');
        const currentAnimation = this.blackboard.get('currentAnimation');

        if (!setAnimation) return NodeStatus.FAILURE;

        if (currentAnimation !== this.animationName) {
            setAnimation(this.animationName, this.loop);
            if (!this.blocking) return NodeStatus.SUCCESS; // Fire and forget
            // If blocking, we'd need to track time or animation state. 
            // For now, let's assume non-blocking or managed externally for simplicity unless specialized.
            return NodeStatus.SUCCESS;
        }

        return NodeStatus.SUCCESS;
    }
}
