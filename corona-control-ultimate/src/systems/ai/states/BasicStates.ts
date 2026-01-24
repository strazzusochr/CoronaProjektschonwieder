import type { AIState } from '../StateMachine';
// import type { AIController } from '../AIController'; // Unused w/ any casting
// import { NPCData } from '@/types/npc'; // Removed unused import

// Wir erweitern AIController temporär um Zugriff auf protected members zu erlauben 
// (In sauberer OOP wären getter/setter da, hier nutzen wir casting/any für Speed)

export class IdleState implements AIState {
    name = 'IDLE';
    private timer: number = 0;

    enter(controller: any) {
        controller.npc.state = 'IDLE';
        this.timer = 1 + Math.random() * 3; // 1-4s wait
    }

    update(controller: any, delta: number) {
        this.timer -= delta;
        
        // Transition Logic
        if (this.timer <= 0) {
            controller.stateMachine.changeState(new WanderState());
        }

        // Threat Detection (Perception Based)
        if (controller.npc.type === 'RIOTER') {
            const playerStimulus = controller.activeStimuli.find((s: any) => s.tags?.includes('PLAYER'));
            if (playerStimulus) {
                 controller.stateMachine.changeState(new AttackState());
            } else {
                // Audio Check (Investigation)
                const noise = controller.activeStimuli.find((s: any) => s.type === 'AUDIO');
                if (noise && Math.random() < 0.7) {
                    // Go check out the noise
                    // Store target in controller for the WanderState to pick up?
                    // For now, simple: just transition to Wander towards noise
                    // Ideally we need an InvestigateState, but Wander can double as it if we set target.
                    // Hack: We can't set target on new WanderState easily without params.
                    // Let's create InvestigateState later. For now, rely on randomness of Wander or add a simple logic.
                }
            }
        }
    }

    exit(_controller: any) {}
}

export class WanderState implements AIState {
    name = 'WALK';
    private target: [number, number, number] | null = null;

    enter(controller: any) {
        controller.npc.state = 'WALK';
        // Pick random point in 15m radius
        const angle = Math.random() * Math.PI * 2;
        const r = 5 + Math.random() * 10;
        this.target = [
            controller.npc.position[0] + r * Math.cos(angle),
            0.5,
            controller.npc.position[2] + r * Math.sin(angle)
        ];
    }

    update(controller: any, delta: number) {
        if (!this.target) return;

        const reached = controller.moveTo(this.target, 2.0, delta); // Speed 2.0

        if (reached) {
            controller.stateMachine.changeState(new IdleState());
        }
    }

    exit(_controller: any) {
        this.target = null;
    }
}

export class AttackState implements AIState {
    name = 'ATTACK';
    
    enter(controller: any) {
        controller.npc.state = 'ATTACK';
    }

    update(controller: any, delta: number) {
        // Check Perception for Player Update
        const playerStimulus = controller.activeStimuli.find((s: any) => s.tags?.includes('PLAYER'));
        
        if (playerStimulus) {
            // Update known position
            controller.lastPlayerPos = playerStimulus.position;
        }

        if (!controller.lastPlayerPos) {
            controller.stateMachine.changeState(new IdleState());
            return;
        }

        // Move to Player
        const reached = controller.moveTo(controller.lastPlayerPos, 4.5, delta); // Fast approach
        if (reached) { /* Attack logic would be here */ }

        // Give up if lost sight (no stimulus) AND distance is far
        // Assuming if we have stimulus, we "see" him.
        if (!playerStimulus && controller.distanceToPlayer > 20) {
             controller.stateMachine.changeState(new WanderState()); // Give up
        }
    }

    exit(_controller: any) {}
}

export class PanicState implements AIState {
    name = 'PANIC';
    private timer: number = 0;
    private escapeDir: [number, number, number] | null = null;

    enter(controller: any) {
        controller.npc.state = 'PANIC';
        this.timer = 5 + Math.random() * 5; // 5-10s panic
        
        // Pick escape direction (random for now, ideally away from danger)
        const angle = Math.random() * Math.PI * 2;
        this.escapeDir = [Math.sin(angle), 0, Math.cos(angle)];
    }

    update(controller: any, delta: number) {
        this.timer -= delta;
        if (this.timer <= 0) {
            controller.stateMachine.changeState(new IdleState());
            return;
        }

        if (this.escapeDir) {
            const target: [number, number, number] = [
                controller.npc.position[0] + this.escapeDir[0] * 5,
                0.5,
                controller.npc.position[2] + this.escapeDir[2] * 5
            ];
            controller.moveTo(target, 5.0, delta); // Fast Run (Speed 5)
        }
    }

    exit(_controller: any) {}
}
