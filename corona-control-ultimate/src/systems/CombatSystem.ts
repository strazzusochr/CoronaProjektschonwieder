
import { useGameStore } from '@/stores/gameStore';

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
        if (p.type === 'MOLOTOV') {
            console.log(`[CombatSystem] BUMM! Molotow-Einschlag bei ${position}`);
            useGameStore.getState().setPrompt("ACHTUNG: Brandsatz detoniert!");
            // Hier könnte man FireSystem.spawnFire(position) aufrufen
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
