
import { useGameStore } from '@/stores/gameStore';
import TacticsManager from '@/managers/TacticsManager';
import AISystem from '@/systems/AISystem';
import * as THREE from 'three';

class CommanderSystem {
    private static instance: CommanderSystem;
    private lastDecisionTime: number = 0;
    private readonly DECISION_INTERVAL = 2000; // Alle 2 Sekunden entscheiden

    // Simulation Log für Verifizierung
    public decisionLog: string[] = [];

    private constructor() { }

    public static getInstance(): CommanderSystem {
        if (!CommanderSystem.instance) {
            CommanderSystem.instance = new CommanderSystem();
        }
        return CommanderSystem.instance;
    }

    public update(delta: number) {
        const now = Date.now();
        if (now - this.lastDecisionTime < this.DECISION_INTERVAL) return;
        this.lastDecisionTime = now;

        const store = useGameStore.getState();
        const tension = store.tensionLevel;

        // 1. Analyse Situation
        // (Vereinfacht: Wir schauen nur auf Tension und Anzahl Rioter)
        // In einer vollen Implementierung würden wir Spatial Queries machen.

        // Wir holen uns die NPCs aus dem Store (oder AISystem, wenn wir Zugriff hätten)
        // Da wir im Store nur einfache Daten haben, nutzen wir diese.
        const rioters = store.npcs.filter(n => n.type === 'RIOTER');
        const police = store.npcs.filter(n => n.type === 'POLICE');

        if (police.length === 0) return; // Keine Polizei, kein Befehl

        // 2. Entscheidungs-Logik
        if (tension > 70 && rioters.length > 5) {
            // Hohe Gefahr -> Charge!
            this.log(`[COMMANDER] High Tension (${tension.toFixed(1)}%) & ${rioters.length} Rioters. ORDER: CHARGE!`);
            TacticsManager.getInstance().commandCharge(1); // Squad 1
        }
        else if (tension > 30 && rioters.length > 0) {
            // Mittlere Gefahr -> Wall bilden
            // Wir bilden die Wall zwischen den Riotern und dem Spieler (oder Zentrum)
            // Vereinfacht: Wall bei Z=10
            this.log(`[COMMANDER] Medium Tension (${tension.toFixed(1)}%). ORDER: FORM WALL.`);
            TacticsManager.getInstance().formWall([-10, 0, 10], [10, 0, 10], 1);
        }
        else {
            // Ruhig -> Patrouille (oder Disband Formation)
            // Aktuell haben wir keinen expliziten "Patrol" Befehl im TacticsManager, 
            // aber wir könnten "Clear Orders" implementieren.
            // this.log(`[COMMANDER] Situation Calm. Holding.`);
        }
    }

    private log(message: string) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const entry = `[${timestamp}] ${message}`;
        console.log(entry);
        this.decisionLog.push(entry);

        // Feedback an UI
        useGameStore.getState().setPrompt(message);
    }

    public getLog(): string {
        return this.decisionLog.join('\n');
    }
}

export default CommanderSystem;
