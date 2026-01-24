import { useGameStore } from '@/stores/gameStore';

class TimeSystem {
    private static instance: TimeSystem;
    private readonly DAY_DURATION = 1440; // Minutes in a day
    private timeSpeed: number = 2.0; // 2x speed by default

    private constructor() { }

    public static getInstance(): TimeSystem {
        if (!TimeSystem.instance) {
            TimeSystem.instance = new TimeSystem();
        }
        return TimeSystem.instance;
    }

    public update(delta: number) {
        const { dayTime, setTime } = useGameStore.getState();

        // Debug NaN & Auto-Fix
        if (isNaN(dayTime) || isNaN(delta)) {
            // Force reset if NaN
            if (isNaN(dayTime)) setTime(1080);
            return;
        }

        // Calculate new time: delta (sec) * speed
        // Assuming dayTime is in minutes:
        // 1 real second = timeSpeed game minutes?
        // Let's assume standard unity-like: 1 real sec * speed = game advancement
        // If dayTime is minutes (0-1440), and we want 1 day = 24 mins real time:
        // 1440 / (24 * 60) = 1 game min per real sec.

        const newTime = (dayTime + delta * this.timeSpeed) % this.DAY_DURATION;
        setTime(newTime);
    }

    public getTimeString(): string {
        const { dayTime } = useGameStore.getState();
        const hours = Math.floor(dayTime / 60);
        const minutes = Math.floor(dayTime % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
}

export default TimeSystem.getInstance();
