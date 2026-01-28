import { StateMachine } from './StateMachine';
import { PerceptionSystem } from './PerceptionSystem';
import { MemorySystem } from './MemorySystem';
import { useGameStore } from '@/stores/gameStore';
import * as THREE from 'three';

export interface NPCContext {
    id: number;
    type: string; // 'POLICE' | 'RIOTER' | 'CIVILIAN'
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

    // V6.0 Deeskalation
    private relationshipScore: number = 0; // -100 (Hate) to +100 (Trust)

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

                this.checkGlobalTension();

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
                this.checkGlobalTension();

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

        // --- RIOT STATE (Phase 7) ---
        this.stateMachine.addState({
            name: 'RIOT',
            onEnter: () => {
                // Aggressives Verhalten
                this.context.attack();
            },
            onUpdate: (delta) => {
                // Einfaches Randalieren: Zum Spieler oder zufällig aggressiv bewegen
                // Hier vereinfacht: Laufe zum Spieler (wenn bekannt) oder wirr umher

                // Check Tension: Wenn Spannung sinkt, beruhigen
                const tension = useGameStore.getState().tensionLevel;
                if (tension < 30) {
                    this.stateMachine.transitionTo('IDLE');
                    return;
                }

                // Random Aggro-Bewegung
                if (Math.random() < 0.05) {
                    const randomDir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
                    this.context.move(randomDir, 3.0); // Schnelles Gehen/Joggen
                }
            }
        });

        // --- CALM STATE (Phase 6: De-escalation) ---
        this.stateMachine.addState({
            name: 'CALM',
            onEnter: () => {
                this.context.stop();
                // Optional: Animation "Hands up" or "Nodding"
            },
            onUpdate: (delta) => {
                // Regenerate relationship slowly back to neutral?
                // Or just stay calm for a while
                if (this.updateTimer > 5.0) { // 5 sec calm
                    this.stateMachine.transitionTo('IDLE');
                }
            }
        });

        // --- FORMATION STATE (Phase 4) ---
        this.stateMachine.addState({
            name: 'FORMATION',
            onEnter: () => {
                // console.log(`NPC ${this.context.id} entering FORMATION`);
            },
            onUpdate: () => {
                if (this.formationTarget) {
                    const dist = this.context.position.distanceTo(this.formationTarget);

                    if (dist > 0.5) {
                        const dir = new THREE.Vector3().subVectors(this.formationTarget, this.context.position).normalize();
                        // Smooth approach
                        const speed = Math.min(3.0, dist * 2);
                        this.context.move(dir, speed);
                        this.context.lookAt(this.formationTarget); // Look at destination? Or Look Forward? Better Look Forward (Squad leader dir)
                        // For prototype: Look at target while moving
                    } else {
                        this.context.stop();

                        // Wenn am Ziel, rotiere wie Leader? 
                        // TODO: FormationDirection übergeben
                    }
                } else {
                    this.stateMachine.transitionTo('IDLE');
                }

                // Break formation on Threat? 
                // Only if huge threat. Police stay disciplined.
            }
        });

        this.stateMachine.transitionTo('IDLE');
    }

    public getContext(): NPCContext {
        return this.context;
    }

    private checkGlobalTension(): void {
        const tension = useGameStore.getState().tensionLevel;

        // Eskalations-Logik
        if (tension > 80) {
            // Hohe Wahrscheinlichkeit für Riot oder Flee (Panik)
            if (Math.random() < 0.01) this.stateMachine.transitionTo('RIOT');
        } else if (tension > 50) {
            // Mittlere Wahrscheinlichkeit
            if (Math.random() < 0.005) this.stateMachine.transitionTo('RIOT');
        }
    }

    private formationTarget: THREE.Vector3 | null = null;

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
            // Only flee if not in formation or police
            if (this.stateMachine.getCurrentStateName() !== 'FORMATION') {
                this.stateMachine.transitionTo('FLEE');
            }
        }
    }

    public getCurrentState(): string {
        return this.stateMachine.getCurrentStateName();
    }

    // --- TACTICS INTERFACE ---
    public orderFormation(target: THREE.Vector3): void {
        this.formationTarget = target;
        this.stateMachine.transitionTo('FORMATION');
    }

    public orderCharge(): void {
        this.formationTarget = null;
        this.stateMachine.transitionTo('RIOT'); // Reuse RIOT state for aggressive charge for now, or add ATTACK
    }

    // --- DEESCALATION INTERFACE ---
    public listenToCommand(type: 'CALM_DOWN' | 'INSULT'): void {
        if (type === 'CALM_DOWN') {
            this.modifyRelationship(20);
            if (this.relationshipScore > 30 && this.stateMachine.getCurrentStateName() === 'RIOT') {
                this.stateMachine.transitionTo('CALM');
            }
        } else if (type === 'INSULT') {
            this.modifyRelationship(-30);
            if (this.relationshipScore < -50) {
                this.stateMachine.transitionTo('RIOT');
            }
        }
    }

    public modifyRelationship(amount: number) {
        this.relationshipScore = Math.max(-100, Math.min(100, this.relationshipScore + amount));
        // console.log(`NPC ${this.context.id} Relationship: ${this.relationshipScore}`);
    }
}
