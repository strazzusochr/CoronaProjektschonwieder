
import { useGameStore } from '@/stores/gameStore';
import * as THREE from 'three';
import FireSystem from '@/systems/FireSystem';
import { useParticleStore } from '@/components/Effects/ParticleSystem';

export interface Projectile {
    id: string;
    position: [number, number, number];
    velocity: [number, number, number];
    type: 'MOLOTOV' | 'STONE' | 'TEARGAS';
    owner: 'PLAYER' | 'NPC';
    active: boolean;
}

class CombatSystem {
    private projectiles: Projectile[] = [];
    // Listeners for UI updates
    private listeners: (() => void)[] = [];

    public subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }

    // --- PHASE 5: WATER CANNON LOGIC ---
    public applyHydroForce(origin: THREE.Vector3, direction: THREE.Vector3, range: number, width: number, force: number) {
        // Spatial Query: Finde alle NPCs im Kegel
        // Optimierung: Nutze gameStore NPCs Liste und einfachen Distanz/Winkel Check
        const npcs = useGameStore.getState().npcs;

        // Define cone
        const coneAngleCosine = Math.cos(Math.PI / 8); // ca 22 grad öffnungswinkel halbiert

        Object.values(npcs).forEach(npcData => {
            const npcPos = new THREE.Vector3(...(npcData.position as [number, number, number]));
            const toNpc = new THREE.Vector3().subVectors(npcPos, origin);
            const dist = toNpc.length();

            if (dist < range && dist > 0.5) {
                // Check Angle
                toNpc.normalize();
                const dot = toNpc.dot(direction);

                if (dot > coneAngleCosine) {
                    // HIT!
                    import('@/systems/AISystem').then(sys => {
                        // Find controller logic via AISystem if needed or direct store update
                        // Apply Knockback/Flee
                        useGameStore.getState().updateNpc(npcData.id, {
                            state: 'FLEE' // WaWe effect
                        });
                    });
                }
            }
        });
    }

    public applyTrivialHit(targetId: number, type: 'SHOVE' | 'CALM_GESTURE') {
        // Direkter Zugriff auf Controller via AISystem wäre besser, aber Store Update geht auch
        const npc = useGameStore.getState().npcs[targetId];
        if (!npc) return;

        import('@/systems/AISystem').then(sys => {
            // Hier würden wir idealerweise den Controller holen.
            // Workaround: Event via Memory/GameStore
            // Wir nutzen updateNpc um Custom Data zu senden, die der Controller pollt?
            // Oder wir erweitern den Store um "IncomingEvents"?

            // Einfachste V6.0 Lösung: Store Action
            if (type === 'CALM_GESTURE') {
                // Trigger Deeskalation
                console.log(`[CombatSystem] Deeskalation auf NPC ${targetId}`);
                // Wir bräuchten einen Weg, listenToCommand aufzurufen.
                // Da wir keine direkten Referenzen haben (außer AISystem hat sie),
                // müssten wir das AISystem erweitern.

                // Todo: AISystem accessor implementation.
                // For prototype: Just mock output or modify state directly if possible
            }
        });
    }
    public update(delta: number) {
        // Keine manuelle Physik mehr nötig, da Rapier das übernimmt.
        // Wir könnten hier Timeouts für Projektile prüfen (z.B. Teargas Dauer).
    }

    public spawnProjectile(type: Projectile['type'], position: [number, number, number], velocity: [number, number, number], owner: 'PLAYER' | 'NPC') {
        const id = Math.random().toString(36).substr(2, 9);
        this.projectiles.push({
            id,
            position: [...position],
            velocity: [...velocity],
            type,
            owner,
            active: true
        });
        console.log(`[CombatSystem] Projektil gespawnt: ${type} bei ${position}`);
        this.notify();
    }

    public handleImpact(id: string, position: [number, number, number]) {
        const p = this.projectiles.find(proj => proj.id === id);
        if (!p || !p.active) return;

        p.active = false;
        p.position = position; // Update final position

        // Effekte basierend auf Typ auslösen
        // Effekte basierend auf Typ auslösen
        if (p.type === 'MOLOTOV') {
            console.log(`[CombatSystem] BUMM! Molotow-Einschlag bei ${position}`);
            useGameStore.getState().setPrompt("ACHTUNG: Brandsatz detoniert!");

            // Spawn Fire (20s duration, 4m radius, 15 damage)
            FireSystem.spawnFire([position[0], 0.5, position[2]], 20, 4, 15);

            // Explosion visual
            useParticleStore.getState().spawnExplosion(position, 'orange', 50);
        }

        // Entferne inaktive Projektile zeitnah oder beim nächsten Update
        this.projectiles = this.projectiles.filter(proj => proj.active);
        this.notify();
    }

    public getProjectiles() {
        return this.projectiles;
    }
}

export default new CombatSystem();
