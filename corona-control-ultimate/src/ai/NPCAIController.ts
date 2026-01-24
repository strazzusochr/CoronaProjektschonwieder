import { StateMachine } from './StateMachine';
import { PerceptionSystem } from './PerceptionSystem';
import type { PerceptionEvent } from './PerceptionSystem';
import { MemorySystem } from './MemorySystem';
import * as THREE from 'three';

export interface NPCContext {
    id: number;
    position: THREE.Vector3;
    forward: THREE.Vector3; // Direction NPC is facing
    // Callbacks to influence the actual Game Entity
    move: (direction: THREE.Vector3, speed: number) => void;
    stop: () => void;
    lookAt: (target: THREE.Vector3) => void;
    attack: () => void;
}

export class NPCAIController {
    public stateMachine: StateMachine;
    public perception: PerceptionSystem;
    public memory: MemorySystem;

    private context: NPCContext;
    private updateTimer: number = 0;
    private readonly UPDATE_RATE = 0.1; // 10 Hz

    constructor(context: NPCContext) {
        this.context = context;
        this.stateMachine = new StateMachine();
        this.perception = new PerceptionSystem();
        this.memory = new MemorySystem();

        this.initializeFSM();
    }

    private initializeFSM(): void {
        // --- IDLE STATE ---
        this.stateMachine.addState({
            name: 'IDLE',
            onEnter: () => {
                this.context.stop();
                // console.log(`NPC ${this.context.id} Entering IDLE`);
            },
            onUpdate: (delta) => {
                // Check Perception for Threats
                if (this.memory.hasEvent('THREAT')) {
                    this.stateMachine.transitionTo('FLEE');
                    return;
                }

                // Random wander chance
                if (Math.random() < 0.01) {
                    this.stateMachine.transitionTo('WANDER');
                }
            }
        });

        // --- WANDER STATE ---
        let wanderTarget: THREE.Vector3 | null = null;
        this.stateMachine.addState({
            name: 'WANDER',
            onEnter: () => {
                // Pick random point around current pos
                wanderTarget = this.context.position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    0,
                    (Math.random() - 0.5) * 10
                ));
            },
            onUpdate: (delta) => {
                if (wanderTarget) {
                    const dir = new THREE.Vector3().subVectors(wanderTarget, this.context.position).normalize();
                    this.context.move(dir, 1.5); // Walk speed
                    this.context.lookAt(wanderTarget);

                    if (this.context.position.distanceTo(wanderTarget) < 1.0) {
                        this.stateMachine.transitionTo('IDLE');
                    }
                }
            }
        });

        // --- FLEE STATE ---
        this.stateMachine.addState({
            name: 'FLEE',
            onEnter: () => {
                // console.log(`NPC ${this.context.id} PANIC! FLEEING!`);
            },
            onUpdate: (delta) => {
                const threat = this.memory.getBestEvent('THREAT');
                if (threat) {
                    const fleeDir = new THREE.Vector3().subVectors(this.context.position, threat.position).normalize();
                    this.context.move(fleeDir, 4.0); // Run speed

                    if (this.context.position.distanceTo(threat.position) > 20) {
                        // Safe distance
                        this.stateMachine.transitionTo('IDLE'); // Or Alert
                    }
                } else {
                    this.stateMachine.transitionTo('IDLE');
                }
            }
        });

        this.stateMachine.transitionTo('IDLE');
    }

    public update(delta: number, currentPos: THREE.Vector3, currentForward: THREE.Vector3): void {
        // Update Context Data
        this.context.position.copy(currentPos);
        this.context.forward.copy(currentForward);

        // Throttle AI Logic
        this.updateTimer += delta;
        if (this.updateTimer >= this.UPDATE_RATE) {

            // 1. Perception Update
            this.perception.update(this.updateTimer, currentPos, currentForward);

            // 2. Process Senses -> Memory
            const sensors = this.perception.getRecentEvents();
            sensors.forEach(e => {
                if (e.type === 'VISUAL' || e.type === 'AUDIO') {
                    // Simple Logic: If we see player/threat, store it
                    // TODO: Differentiate Entity Types
                    // For now, assume anything in perception is noteworthy
                    this.memory.addEvent('SEEN_ENTITY', e.position, 1);
                }
            });

            // 3. FSM Update
            this.stateMachine.update(this.updateTimer);

            // 4. Memory Decay
            this.memory.update();

            this.updateTimer = 0;
        }
    }

    public onSensoryInput(type: string, position: THREE.Vector3): void {
        // External trigger (e.g. from Global Event System)
        if (type === 'EXPLOSION') {
            this.memory.addEvent('THREAT', position, 10);
            this.stateMachine.transitionTo('FLEE');
        }
    }

    public getCurrentState(): string {
        return this.stateMachine.getCurrentStateName();
    }
}
