/**
 * Corona Control Ultimate - Fire System
 * Gemäß V6.0 Phase 3: "Umgebungs-Chaos"
 * 
 * Verwaltet aktive Brände:
 * - Schaden an Entities im Radius (Spieler + NPCs)
 * - Visuelle Partikel (via ParticleSystem-Aufrufe)
 * - Ausbreitung (optional für später, hier Radius-basiert)
 */

import EngineLoop from '@/core/EngineLoop';
import { useGameStore } from '@/stores/gameStore';
import { useParticleStore } from '@/components/Effects/ParticleSystem';
import * as THREE from 'three';

interface ActiveFire {
    id: string;
    position: [number, number, number];
    radius: number;
    intensity: number; // Schaden pro Tick
    duration: number;  // Restzeit in Sekunden
    tickTimer: number; // Timer für Schaden (1Hz)
}

class FireSystem {
    private static instance: FireSystem;
    private fires: ActiveFire[] = [];

    // Konfiguration
    private readonly DAMAGE_TICK_RATE = 1.0; // Schaden jede Sekunde
    private readonly SPAWN_PARTICLE_RATE = 0.1; // Partikel alle 0.1s
    private particleTimer = 0;

    private constructor() {
        // Registriere Update Loop (Global event frequency 0.2Hz ist zu langsam für Partikel, 
        // also nutzen wir Physics oder AI Loop? Physics update ist 120Hz, AI 10Hz. 
        // Wir nehmen AI Loop (10Hz) für Logic updates, oder registrieren einfach in EngineLoop als custom callback falls möglich.
        // EngineLoop hat Physics, AI, UI, Global. 
        // Wir nutzen AI (10Hz) für Logic, ist ok.
        EngineLoop.onAIUpdate(this.update.bind(this));
        console.log("🔥 FIRE SYSTEM INITIALIZED (V6.0)");
    }

    public static getInstance(): FireSystem {
        if (!FireSystem.instance) {
            FireSystem.instance = new FireSystem();
        }
        return FireSystem.instance;
    }

    /**
     * Erzeugt ein neues Feuer an Position
     */
    public spawnFire(position: [number, number, number], duration: number = 20, radius: number = 3, intensity: number = 10) {
        const id = Math.random().toString(36).substr(2, 9);
        this.fires.push({
            id,
            position,
            duration,
            radius,
            intensity,
            tickTimer: 0
        });
        console.log(`[FireSystem] Feuer ausgebrochen bei ${position} (Radius: ${radius}m)`);
    }

    /**
     * Update Loop (ca. 10Hz)
     */
    public update(delta: number) {
        if (this.fires.length === 0) return;

        const store = useGameStore.getState();
        const playerPos = store.player.position;
        const particleStore = useParticleStore.getState();

        // Partikel-Timer
        this.particleTimer += delta;
        const shouldSpawnParticles = this.particleTimer >= this.SPAWN_PARTICLE_RATE;
        if (shouldSpawnParticles) this.particleTimer = 0;

        // Feuer-Update
        this.fires = this.fires.filter(fire => {
            fire.duration -= delta;
            fire.tickTimer += delta;

            // 1. Schaden verteilen (Jede Sekunde)
            if (fire.tickTimer >= this.DAMAGE_TICK_RATE) {
                fire.tickTimer = 0;
                this.applyAreaDamage(fire, store.npcs, playerPos);
            }

            // 2. Visuelle Effekte (Sustained Fire)
            if (shouldSpawnParticles) {
                // Spawne mehrere Partikel im Radius
                for (let i = 0; i < 3; i++) {
                    const offset = [
                        (Math.random() - 0.5) * fire.radius,
                        0.5,
                        (Math.random() - 0.5) * fire.radius
                    ];
                    particleStore.spawnExplosion(
                        [fire.position[0] + offset[0], fire.position[1] + offset[1], fire.position[2] + offset[2]],
                        'orange', // Feuerfarbe
                        1 // Einzelner Partikel, aber oft
                    );
                }
            }

            return fire.duration > 0;
        });
    }

    /**
     * Wendet Schaden auf Entities im Radius an
     */
    private applyAreaDamage(fire: ActiveFire, npcs: any[], playerPos: any) {
        const firePos = new THREE.Vector3(...fire.position);

        // A. Spieler Check
        const pPos = new THREE.Vector3(...playerPos);
        if (pPos.distanceTo(firePos) <= fire.radius) {
            useGameStore.getState().takeDamage(fire.intensity);
            console.log("[FireSystem] Spieler verbrennt!");
            useGameStore.getState().setPrompt("FEUER! Raus da!");
        }

        // B. NPC Check (Vereinfacht: Loop über alle. Upgrade: Spatial Grid)
        // Check nur NPCs die nah genug sind (Optimierung: Store sollte nur nahe liefern oder wir iterieren alle)
        // Bei 500 NPCs ist Iteration ok für 10Hz? Besser nur 1Hz (was wir hier tun).
        npcs.forEach(npc => {
            const nPos = new THREE.Vector3(...npc.position);
            if (nPos.distanceTo(firePos) <= fire.radius) {
                // Schaden Logik? NPC hat aktuell kein HP Feld im Store Array (nur position/state).
                // Wir simulieren Panic State Änderung
                if (npc.state !== 'FLEE' && npc.state !== 'ARRESTED') {
                    useGameStore.getState().updateNpc(npc.id, { state: 'FLEE' });
                }
            }
        });
    }
}

export default FireSystem.getInstance();
