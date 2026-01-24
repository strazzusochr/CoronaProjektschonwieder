import { AIController } from './AIController';
import { IdleState, AttackState } from './states/BasicStates';
import { FormationHoldState } from './states/PoliceStates';
import type { NPCData } from '@/types/npc';

export class PoliceController extends AIController {
    public formationTarget: [number, number, number] | null = null;
    public squadId: number = -1;

    constructor(npc: NPCData) {
        super(npc);
        this.stateMachine.changeState(new IdleState());
        import('../../managers/TacticsManager').then(m => {
            m.default.getInstance().registerController(this);
        });
    }

    public update(delta: number, playerPos?: [number, number, number] | number[]) {
        super.update(delta, playerPos);
        
        // Police High-Level Logic
        
        // 1. Formation Override
        // If we have a formation target and NOT in formation state, go there
        if (this.formationTarget && this.stateMachine.getCurrentStateName() !== 'FORMATION_HOLD') {
            this.stateMachine.changeState(new FormationHoldState(this.formationTarget));
        }

        // 2. Attack logic override (only if not in strict formation)
        if (!this.formationTarget) {
            // Standard patrol/engage logic
             if (this.distanceToPlayer < 10 && this.stateMachine.getCurrentStateName() !== 'ATTACK') {
                // Engaging Player
                this.stateMachine.changeState(new AttackState());
            }
        }
    }
    
    public orderMoveTo(target: [number, number, number]) {
        this.formationTarget = null; // Clear formation anchor
        // TODO: Implement move logic using target
        console.log("Order move to", target);
    }

    public orderFormation(pos: [number, number, number]) {
        this.formationTarget = pos;
        this.stateMachine.changeState(new FormationHoldState(pos));
    }
    
    public orderCharge() {
        this.formationTarget = null;
        this.stateMachine.changeState(new AttackState());
    }

    public clearOrders() {
        this.formationTarget = null;
        this.stateMachine.changeState(new IdleState());
    }
}
