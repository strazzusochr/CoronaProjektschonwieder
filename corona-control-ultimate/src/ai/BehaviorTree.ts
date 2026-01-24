
export enum NodeStatus {
    RUNNING = 'RUNNING',
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE'
}

export class Blackboard {
    private data: Map<string, any> = new Map();

    set(key: string, value: any): void {
        this.data.set(key, value);
    }

    get(key: string): any {
        return this.data.get(key);
    }

    has(key: string): boolean {
        return this.data.has(key);
    }

    remove(key: string): void {
        this.data.delete(key);
    }

    clear(): void {
        this.data.clear();
    }
}

export abstract class BehaviorTreeNode {
    protected status: NodeStatus = NodeStatus.RUNNING;
    protected children: BehaviorTreeNode[] = [];
    protected parent: BehaviorTreeNode | null = null;
    protected blackboard: Blackboard;

    constructor(blackboard: Blackboard) {
        this.blackboard = blackboard;
    }

    abstract execute(): NodeStatus;

    reset(): void {
        this.status = NodeStatus.RUNNING;
        this.children.forEach(child => child.reset());
    }

    addChild(child: BehaviorTreeNode): void {
        this.children.push(child);
        child.parent = this;
    }
}

// --- Composites ---

export class SequenceNode extends BehaviorTreeNode {
    // Execute children in order until one fails
    execute(): NodeStatus {
        for (const child of this.children) {
            const childStatus = child.execute();

            if (childStatus === NodeStatus.RUNNING) {
                return NodeStatus.RUNNING;
            } else if (childStatus === NodeStatus.FAILURE) {
                this.reset();
                return NodeStatus.FAILURE;
            } else if (childStatus === NodeStatus.SUCCESS) {
                continue; // Move to next child
            }
        }

        // All children succeeded
        this.reset();
        return NodeStatus.SUCCESS;
    }
}

export class SelectorNode extends BehaviorTreeNode {
    // Execute children until one succeeds (Fallback)
    execute(): NodeStatus {
        for (const child of this.children) {
            const childStatus = child.execute();

            if (childStatus === NodeStatus.RUNNING) {
                return NodeStatus.RUNNING;
            } else if (childStatus === NodeStatus.SUCCESS) {
                this.reset();
                return NodeStatus.SUCCESS;
            } else if (childStatus === NodeStatus.FAILURE) {
                continue; // Try next child
            }
        }

        // All children failed
        this.reset();
        return NodeStatus.FAILURE;
    }
}

export class ParallelNode extends BehaviorTreeNode {
    private successPolicy: 'REQUIRE_ALL' | 'REQUIRE_ONE';
    private failurePolicy: 'ANY_FAILS' | 'ALL_FAIL';

    constructor(blackboard: Blackboard, successPolicy: 'REQUIRE_ALL' | 'REQUIRE_ONE' = 'REQUIRE_ALL', failurePolicy: 'ANY_FAILS' | 'ALL_FAIL' = 'ANY_FAILS') {
        super(blackboard);
        this.successPolicy = successPolicy;
        this.failurePolicy = failurePolicy;
    }

    execute(): NodeStatus {
        let successCount = 0;
        let failureCount = 0;
        let runningCount = 0;

        for (const child of this.children) {
            // Note: Parallel nodes typically execute ALL children every tick, or at least active ones
            // Assuming simplified logic where we re-execute or check status
            const status = child.execute();

            if (status === NodeStatus.SUCCESS) successCount++;
            else if (status === NodeStatus.FAILURE) failureCount++;
            else if (status === NodeStatus.RUNNING) runningCount++;
        }

        if (this.successPolicy === 'REQUIRE_ALL' && successCount === this.children.length) {
            this.reset();
            return NodeStatus.SUCCESS;
        }
        if (this.successPolicy === 'REQUIRE_ONE' && successCount > 0) {
            this.reset();
            return NodeStatus.SUCCESS;
        }

        if (this.failurePolicy === 'ANY_FAILS' && failureCount > 0) {
            this.reset();
            return NodeStatus.FAILURE;
        }
        if (this.failurePolicy === 'ALL_FAIL' && failureCount === this.children.length) {
            this.reset();
            return NodeStatus.FAILURE;
        }

        return NodeStatus.RUNNING;
    }
}

// --- Decorators ---

export class InverterNode extends BehaviorTreeNode {
    execute(): NodeStatus {
        if (this.children.length === 0) return NodeStatus.SUCCESS; // Or failure?
        const child = this.children[0];
        const status = child.execute();

        if (status === NodeStatus.SUCCESS) return NodeStatus.FAILURE;
        if (status === NodeStatus.FAILURE) return NodeStatus.SUCCESS;
        return NodeStatus.RUNNING;
    }
}

export class RepeaterNode extends BehaviorTreeNode {
    private repeatCount: number; // -1 for infinite
    private currentIteration: number = 0;

    constructor(blackboard: Blackboard, repeatCount: number = -1) {
        super(blackboard);
        this.repeatCount = repeatCount;
    }

    execute(): NodeStatus {
        if (this.children.length === 0) return NodeStatus.SUCCESS;
        const child = this.children[0];

        if (this.currentIteration < this.repeatCount || this.repeatCount === -1) {
            const status = child.execute();

            if (status === NodeStatus.SUCCESS || status === NodeStatus.FAILURE) {
                this.currentIteration++;
                child.reset();
                return NodeStatus.RUNNING; // Keep repeating
            }
            return NodeStatus.RUNNING;
        }

        this.currentIteration = 0;
        return NodeStatus.SUCCESS;
    }
}

export class ConditionalNode extends BehaviorTreeNode {
    private conditionFunction: (bb: Blackboard) => boolean;

    constructor(blackboard: Blackboard, conditionFn: (bb: Blackboard) => boolean) {
        super(blackboard);
        this.conditionFunction = conditionFn;
    }

    execute(): NodeStatus {
        if (this.conditionFunction(this.blackboard)) {
            if (this.children.length > 0) return this.children[0].execute();
            return NodeStatus.SUCCESS;
        }
        return NodeStatus.FAILURE;
    }
}

// --- Action Nodes (Base) ---

export abstract class ActionNode extends BehaviorTreeNode {
    // Leaf nodes
}
