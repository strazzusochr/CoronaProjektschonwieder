
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';
import { NPCAIController } from './NPCAIController';

interface Squad {
    id: number;
    leaderId: number;
    memberIds: number[];
    tactic: 'WALL' | 'CIRCLE' | 'CHARGE' | 'PATROL';
    targetPosition: THREE.Vector3;
}

export class TacticsManager {
    private static instance: TacticsManager;
    private squads: Squad[] = [];
    private policeControllers: Map<number, NPCAIController> = new Map();
    private rioterControllers: Map<number, NPCAIController> = new Map();

    private readonly UPDATE_RATE = 1.0; // 1Hz strategic update
    private timer = 0;

    private constructor() { }

    public static getInstance(): TacticsManager {
        if (!TacticsManager.instance) {
            TacticsManager.instance = new TacticsManager();
        }
        return TacticsManager.instance;
    }

    public registerController(id: number, type: string, controller: NPCAIController) {
        if (type === 'POLICE' || type === 'KRAUSE') {
            this.policeControllers.set(id, controller);
        } else if (type === 'RIOTER') {
            this.rioterControllers.set(id, controller);
        }
    }

    public unregisterController(id: number) {
        this.policeControllers.delete(id);
        this.rioterControllers.delete(id);

        // Remove from squads
        this.squads = this.squads.filter(s => {
            if (s.leaderId === id) {
                // Leader gone, disband squad
                console.log(`[TacticsManager] Squad ${s.id} disbanded (Leader lost)`);
                // Release members? They will be picked up next update
                return false;
            }
            s.memberIds = s.memberIds.filter(mid => mid !== id);
            return true;
        });
    }

    public update(delta: number) {
        this.timer += delta;
        if (this.timer < this.UPDATE_RATE) return;
        this.timer = 0;

        this.formSquads();
        this.evaluateTactics();
    }

    private formSquads() {
        const assignedIds = new Set<number>();
        this.squads.forEach(s => {
            assignedIds.add(s.leaderId);
            s.memberIds.forEach(m => assignedIds.add(m));
        });

        const freePolice = Array.from(this.policeControllers.entries())
            .filter(([id, _]) => !assignedIds.has(id));

        // Form new squads if enough units (min 3)
        if (freePolice.length >= 3) {
            const leader = freePolice[0];
            const members = freePolice.slice(1, 4).map(p => p[0]); // Up to 3 members

            const newSquad: Squad = {
                id: Math.floor(Math.random() * 100000),
                leaderId: leader[0],
                memberIds: members,
                tactic: 'PATROL',
                targetPosition: new THREE.Vector3(0, 0, 0)
            };
            this.squads.push(newSquad);
            console.log(`[TacticsManager] New Squad ${newSquad.id} formed. Leader: ${leader[0]}, Members: ${members.length}`);
        }
    }

    private evaluateTactics() {
        const tension = useGameStore.getState().tensionLevel;

        this.squads.forEach(squad => {
            let nextTactic: Squad['tactic'] = 'PATROL';

            if (tension > 80) {
                nextTactic = 'CHARGE';
            } else if (tension > 40) {
                nextTactic = 'WALL';
            }

            if (squad.tactic !== nextTactic) {
                this.issueCommand(squad, nextTactic);
            } else {
                // Refresh formation positions periodically
                this.issueCommand(squad, squad.tactic);
            }
        });

        // Rioter Logic (Flanking)
        // Einfache Logik: Wenn viele Polizisten auf einem Haufen sind, versuche drumherum zu gehen
        if (tension > 60) {
            this.rioterControllers.forEach((controller, id) => {
                // Check if engaged?
                // const ctx = controller.getContext();
                // Simplistic Flank: If Wall ahead, move sideways
                // TODO: Raycast logic or simply force move to Player but avoid Police center mass
            });
        }
    }

    private issueCommand(squad: Squad, tactic: Squad['tactic']) {
        squad.tactic = tactic;
        const leader = this.policeControllers.get(squad.leaderId);
        if (!leader) return;

        // Leader Logik: Bleibt erstmal stehen oder bewegt sich in Zukunft strategisch
        // Wir lassen den Leader einfach seine Position behalten (IDLE/PATROL logic im Controller)
        const leaderCtx = leader.getContext();
        const leaderPos = leaderCtx.position.clone();
        const leaderForward = leaderCtx.forward.clone().normalize();

        // Right vector
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), leaderForward).normalize();

        // 1. Command Leader
        // Wenn CHARGE, dann auch Leader attackieren? 
        if (tactic === 'CHARGE') {
            leader.orderCharge();
        } else {
            // Leader holds position for formation
            if (leader.getCurrentState() !== 'IDLE' && tactic === 'WALL') {
                // Leader stop?
            }
        }

        // 2. Command Members
        squad.memberIds.forEach((mid, index) => {
            const member = this.policeControllers.get(mid);
            if (member) {
                if (tactic === 'CHARGE') {
                    member.orderCharge();
                } else if (tactic === 'WALL') {
                    // Wall: Links und Rechts vom Leader aufreihen
                    // Index 0 -> Rechts 1, Index 1 -> Links 1, Index 2 -> Rechts 2 ...
                    const side = index % 2 === 0 ? 1 : -1; // 1 = Right, -1 = Left (wegen cross product orientation checken)
                    // cross(UP, FWD) = RIGHT.

                    const slotIndex = Math.floor(index / 2) + 1;
                    const spacing = 1.5;

                    const offset = right.clone().multiplyScalar(side * slotIndex * spacing);
                    const target = leaderPos.clone().add(offset); // TODO: + etwas zurückgezogen? "Echelon"?

                    member.orderFormation(target);
                } else if (tactic === 'PATROL') {
                    // Follow behind leader
                    const offset = leaderForward.clone().multiplyScalar(-1.5 * (index + 1));
                    const target = leaderPos.clone().add(offset);
                    member.orderFormation(target);
                }
            }
        });
    }
}

export default TacticsManager.getInstance();
