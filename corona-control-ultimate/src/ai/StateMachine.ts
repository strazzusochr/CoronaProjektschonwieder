export interface AIState {
    name: string;
    onEnter?: () => void;
    onUpdate?: (delta: number) => void;
    onExit?: () => void;
}

export class StateMachine {
    private states: Map<string, AIState> = new Map();
    private currentState: AIState | null = null;
    private isTransitioning: boolean = false;

    constructor() { }

    public addState(state: AIState): void {
        this.states.set(state.name, state);
    }

    public transitionTo(stateName: string): void {
        const nextState = this.states.get(stateName);
        if (!nextState) {
            console.warn(`[StateMachine] Cannot transition to unknown state: ${stateName}`);
            return;
        }

        if (this.currentState === nextState && !this.isTransitioning) {
            return; // Already in this state
        }

        this.isTransitioning = true;

        // Exit current
        if (this.currentState && this.currentState.onExit) {
            this.currentState.onExit();
        }

        // Switch
        // console.log(`[StateMachine] Transition: ${this.currentState?.name} -> ${nextState.name}`);
        this.currentState = nextState;

        // Enter new
        if (this.currentState.onEnter) {
            this.currentState.onEnter();
        }

        this.isTransitioning = false;
    }

    public update(delta: number): void {
        if (this.currentState && this.currentState.onUpdate) {
            this.currentState.onUpdate(delta);
        }
    }

    public getCurrentStateName(): string {
        return this.currentState ? this.currentState.name : 'NONE';
    }
}
