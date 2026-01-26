
import { NPCAIController } from '@/ai/NPCAIController';
import * as THREE from 'three';

class TacticsManager {
    private static instance: TacticsManager;
    private squads: Map<number, number[]> = new Map(); // SquadID -> NPC IDs
    private controllers: Map<number, NPCAIController> = new Map();

    private constructor() { }

    public static getInstance(): TacticsManager {
        if (!TacticsManager.instance) {
            TacticsManager.instance = new TacticsManager();
        }
        return TacticsManager.instance;
    }

    // Assigns loose police to a squad
    public registerPolice(npcId: number) {
        // Simple logic: Add to squad 1 for testing
        if (!this.squads.has(1)) this.squads.set(1, []);
        this.squads.get(1)!.push(npcId);
        console.log(`Registered Police ${npcId} to Squad 1`);
    }

    // Called by NPCAIController to register itself
    public registerController(controller: NPCAIController) {
        // Access context via any cast because it's private (in a clean arch we'd have a getter)
        const id = (controller as any).context.id;

        if (!this.squads.has(1)) this.squads.set(1, []);
        // Avoid duplicate
        const squad = this.squads.get(1);
        if (squad && !squad.includes(id)) {
            squad.push(id);
        }

        // Store controller Ref
        this.controllers.set(id, controller);
    }

    public unregisterController(id: number) {
        this.controllers.delete(id);
        const s = this.squads.get(1);
        if (s) {
            const idx = s.indexOf(id);
            if (idx > -1) s.splice(idx, 1);
        }
    }

    // Command: Form a line between A and B
    public formWall(start: [number, number, number], end: [number, number, number], squadId: number = 1) {
        this.formWallInternal(start, end, squadId);
    }

    public commandCharge(squadId: number = 1) {
        const squad = this.squads.get(squadId);
        if (!squad) return;

        for (const id of squad) {
            this.commandNpc(id, 'CHARGE');
        }
    }

    private executeCommandInternal(id: number, command: 'FORM' | 'CHARGE', pos?: [number, number, number]) {
        const ctrl = this.controllers.get(id);
        if (ctrl) {
            if (command === 'FORM' && pos) {
                ctrl.orderFormation(new THREE.Vector3(...pos));
            } else if (command === 'CHARGE') {
                ctrl.orderCharge();
            }
        }
    }

    private commandNpc(id: number, command: 'FORM' | 'CHARGE', data?: any) {
        this.executeCommandInternal(id, command, data);
    }

    public formWallInternal(start: [number, number, number], end: [number, number, number], squadId: number) {
        const squad = this.squads.get(squadId);
        if (!squad) return;

        const count = squad.length;
        const startVec = new THREE.Vector3(...start);
        const endVec = new THREE.Vector3(...end);

        for (let i = 0; i < count; i++) {
            const t = count > 1 ? i / (count - 1) : 0.5;
            const slotPos = new THREE.Vector3().lerpVectors(startVec, endVec, t);
            this.executeCommandInternal(squad[i], 'FORM', [slotPos.x, slotPos.y, slotPos.z]);
        }
    }
}

export default TacticsManager;
