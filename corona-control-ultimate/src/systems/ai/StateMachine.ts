export interface AIState {
    name: string;
    enter(controller: any): void;
    update(controller: any, delta: number): void;
    exit(controller: any): void;
}

export class StateMachine {
    private currentState: AIState | null = null;
    private controller: any;

    constructor(controller: any) {
        this.controller = controller;
    }

    public changeState(newState: AIState) {
        if (this.currentState) {
            this.currentState.exit(this.controller);
        }

        this.currentState = newState;
        
        if (this.currentState) {
            // console.log(`Transitioning to ${this.currentState.name}`);
            this.currentState.enter(this.controller);
        }
    }

    public update(delta: number) {
        if (this.currentState) {
            this.currentState.update(this.controller, delta);
        }
    }

    public getCurrentStateName(): string {
        return this.currentState ? this.currentState.name : 'NONE';
    }
}
