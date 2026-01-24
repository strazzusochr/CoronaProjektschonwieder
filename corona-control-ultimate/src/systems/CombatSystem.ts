
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
    private readonly GRAVITY = -9.81;

    public update(delta: number) {
        // 1. Projektile aktualisieren
        this.projectiles.forEach(p => {
            if (!p.active) return;

            // Physik-Update (Einfache Euler-Integration)
            p.velocity[1] += this.GRAVITY * delta;

            p.position[0] += p.velocity[0] * delta;
            p.position[1] += p.velocity[1] * delta;
            p.position[2] += p.velocity[2] * delta;

            // Kollisionserkennung (Bodenebene y=0)
            if (p.position[1] <= 0) {
                this.handleImpact(p);
            }
        });

        // Bereinigen inaktiver Projektile
        this.projectiles = this.projectiles.filter(p => p.active);
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
    }

    private handleImpact(p: Projectile) {
        p.active = false;
        p.position[1] = 0; // Auf Boden fixieren

        // Effekte basierend auf Typ auslösen
        if (p.type === 'MOLOTOV') {
            // Feuerzonen-Logik hier spawnen (Visuals werden von React-Komponenten über Store/Events behandelt)
            console.log(`[CombatSystem] BUMM! Molotow-Einschlag bei ${p.position}`);

            // Beispiel: Spannung erhöhen
            // TensionSystem wird separat in eigenem Update behandelt,
            // aber wir können auf Store zugreifen oder Events dispatchen.
            // Vorerst einfaches Log.
            useGameStore.getState().setPrompt("ACHTUNG: Brandsatz detoniert!");
        }
    }

    // Helfer um Projektile für das Rendering zu erhalten
    public getProjectiles() {
        return this.projectiles;
    }
}

export default new CombatSystem();
