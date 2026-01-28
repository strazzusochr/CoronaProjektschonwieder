import { useGameStore } from '@/stores/gameStore';

/**
 * TimeSystem - Herzschlag der Simulation
 * Gemäß V6.0 Spezifikation: 24h Spielzeit = 24 Minuten Realzeit
 * 
 * Kompression: 1:60 (1 echte Sekunde = 1 Spielminute)
 * - 1 Spieltag = 1440 Spielminuten = 24 Realminuten
 * - 1 Spielstunde = 60 Spielminuten = 60 Realsekunden
 * - 1 Spielminute = 1 Realsekunde
 */
class TimeSystem {
    private static instance: TimeSystem;

    // 1440 Minuten in einem Spieltag (24h * 60min)
    private readonly DAY_DURATION = 1440;

    // V6.0 KORREKTUR: timeSpeed = 60.0 für 1:60 Kompression
    // 1 Realsekunde = 1 Spielminute (60 Spielsekunden)
    private timeSpeed: number = 60.0;

    // Max deltaTime Klammerung für Stabilität (verhindert "Spiral of Death")
    private readonly MAX_DELTA: number = 0.1; // 100ms max

    private constructor() { }

    public static getInstance(): TimeSystem {
        if (!TimeSystem.instance) {
            TimeSystem.instance = new TimeSystem();
        }
        return TimeSystem.instance;
    }

    /**
     * Update wird jeden Frame aufgerufen
     * @param delta - Zeit seit letztem Frame in Sekunden
     */
    public update(delta: number): void {
        const { gameState, setTime } = useGameStore.getState();
        const dayTime = gameState.dayTime;

        // NaN-Schutz
        if (isNaN(dayTime) || isNaN(delta)) {
            if (isNaN(dayTime)) setTime(360); // 06:00 Standard-Startzeit
            return;
        }

        // KRITISCH: deltaTime Klammerung für Stabilität
        // Verhindert Teleportation bei Frame-Drops oder Tab-Wechsel
        const clampedDelta = Math.min(delta, this.MAX_DELTA);

        // Berechnung: 1 echte Sekunde = timeSpeed Spielminuten
        // Bei timeSpeed=60: 1s real = 60 Spielminuten = 1 Spielstunde
        // Bei timeSpeed=1: 1s real = 1 Spielminute (Echtzeit)
        const newTime = (dayTime + clampedDelta * this.timeSpeed) % this.DAY_DURATION;
        setTime(newTime);
    }

    /**
     * Formatierte Zeit für UI-Anzeige (HH:MM)
     */
    public getTimeString(): string {
        const dayTime = useGameStore.getState().gameState.dayTime;
        const hours = Math.floor(dayTime / 60);
        const minutes = Math.floor(dayTime % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    /**
     * Formatierte Zeit mit Sekunden (HH:MM:SS)
     */
    public getTimeStringDetailed(): string {
        const dayTime = useGameStore.getState().gameState.dayTime;
        const hours = Math.floor(dayTime / 60);
        const minutes = Math.floor(dayTime % 60);
        const seconds = Math.floor((dayTime % 1) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Aktuelle Tageszeit in Spielminuten (0-1440)
     */
    public getCurrentGameMinutes(): number {
        return useGameStore.getState().gameState.dayTime;
    }

    /**
     * Aktuelle Spielstunde (0-23)
     */
    public getCurrentHour(): number {
        return Math.floor(useGameStore.getState().gameState.dayTime / 60);
    }

    /**
     * Zeit-Geschwindigkeit setzen
     * @param speed - Spielminuten pro Realsekunde (Standard: 60 für 24h=24min)
     */
    public setTimeSpeed(speed: number): void {
        this.timeSpeed = Math.max(0, speed);
    }

    /**
     * Zeit-Geschwindigkeit abrufen
     */
    public getTimeSpeed(): number {
        return this.timeSpeed;
    }

    /**
     * Ist es Nacht? (22:00 - 06:00)
     */
    public isNight(): boolean {
        const hour = this.getCurrentHour();
        return hour >= 22 || hour < 6;
    }

    /**
     * Aktuelle Tagesphase
     */
    public getCurrentPhase(): 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT' {
        const hour = this.getCurrentHour();
        if (hour >= 6 && hour < 12) return 'MORNING';
        if (hour >= 12 && hour < 18) return 'MIDDAY';
        if (hour >= 18 && hour < 22) return 'EVENING';
        return 'NIGHT';
    }
}

export default TimeSystem.getInstance();
