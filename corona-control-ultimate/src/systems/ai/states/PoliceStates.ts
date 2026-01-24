import type { AIState } from '../StateMachine';
// import type { PoliceController } from '../PoliceController';

export class FormationHoldState implements AIState {
    name = 'FORMATION_HOLD';
    private targetPos: [number, number, number] | null = null;

    constructor(targetPos?: [number, number, number]) {
        if (targetPos) this.targetPos = targetPos;
    }

    enter(controller: any) {
        controller.npc.state = 'IDLE'; // Animation state
        // If targetPos was passed in constructor, use it. 
        // Otherwise assume it's set on controller or TacticsManager.
        if (!this.targetPos && controller.formationTarget) {
            this.targetPos = controller.formationTarget;
        }
    }

    update(controller: any, delta: number) {
        // 1. Move to formation position
        if (this.targetPos) {
            const range = 0.5;
            const distSq = 
                Math.pow(controller.npc.position[0] - this.targetPos[0], 2) + 
                Math.pow(controller.npc.position[2] - this.targetPos[2], 2);

            if (distSq > range * range) {
                controller.moveTo(this.targetPos, 3.5, delta); // Jog to position
                controller.npc.state = 'WALK';
            } else {
                // At position, turn to face threat (or forward)
                // For now, face -Z (default forward) or specific direction
                // TODO: Add facing direction to formation command
                controller.npc.state = 'IDLE';
                
                // Keep strictly at position ( resist push )
                // Maybe add some "push back" logic here against Rioters
            }
        }

        // 2. Break formation if authorized (e.g. attacked heavily) or commanded
        // For now, strict obedience.
    }

    exit(_controller: any) {}
}

export class ArrestState implements AIState {
    name = 'ARREST';
    enter(controller: any) {
        controller.npc.state = 'ATTACK'; 
    }
    update(_controller: any, _delta: number) {
        // Placeholder
    }
    exit(_controller: any) {}
}
