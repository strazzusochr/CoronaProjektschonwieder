
export class TimeManager {
    private static instance: TimeManager;
    private gameTimeSeconds: number = 0; // Seconds since midnight (0-86400)
    private timeScale: number = 60; // 1 real sec = 1 game min
    private isPaused: boolean = false;

    private constructor() {
        // Start at 13:30 (13.5 * 3600 = 48600)
        this.gameTimeSeconds = 48600;
    }

    public static getInstance(): TimeManager {
        if (!TimeManager.instance) {
            TimeManager.instance = new TimeManager();
        }
        return TimeManager.instance;
    }

    public update(dt: number) {
        if (this.isPaused) return;

        this.gameTimeSeconds += dt * this.timeScale;
        if (this.gameTimeSeconds >= 86400) {
            this.gameTimeSeconds %= 86400; // Loop day
        }
    }

    public getTimeString(): string {
        const totalMinutes = Math.floor(this.gameTimeSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    public getSeconds(): number {
        return this.gameTimeSeconds;
    }

    public setTime(hours: number, minutes: number) {
        this.gameTimeSeconds = (hours * 3600) + (minutes * 60);
    }
}
