export const EVENT_PHASES = {
  MORNING: { start: 6, end: 9, label: 'Morgengrauen', ambient: 0.4 },
  DAY: { start: 9, end: 18, label: 'Tagbetrieb', ambient: 1.0 },
  EVENING: { start: 18, end: 22, label: 'Abenddämmerung', ambient: 0.6 },
  NIGHT: { start: 22, end: 6, label: 'Nachtruhe', ambient: 0.1 }
};

export class EventScheduler {
  private gameTimeSeconds: number = 21540; // Start bei 05:59:00 (21540s)

  update(deltaMinutes: number) {
    this.gameTimeSeconds = (this.gameTimeSeconds + deltaMinutes * 60) % 86400;
  }

  setGameTime(h: number, m: number, s: number = 0) {
    this.gameTimeSeconds = h * 3600 + m * 60 + s;
  }

  getCurrentPhase() {
    const hour = Math.floor(this.getHour());
    if (hour >= 6 && hour < 9) return EVENT_PHASES.MORNING;
    if (hour >= 9 && hour < 18) return EVENT_PHASES.DAY;
    if (hour >= 18 && hour < 22) return EVENT_PHASES.EVENING;
    return EVENT_PHASES.NIGHT;
  }

  getHour() {
    return this.gameTimeSeconds / 3600;
  }

  getTimeString() {
    const hours = Math.floor(this.gameTimeSeconds / 3600);
    const minutes = Math.floor((this.gameTimeSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  getGameTimeSeconds() {
    return this.gameTimeSeconds;
  }
}
