export const EVENT_PHASES = {
  MORNING: { start: 6, end: 8, label: 'Morgengrauen', ambient: 0.4 },
  RUSH_HOUR: { start: 8, end: 10, label: 'Frühstücks-Rush', ambient: 0.8 },
  DEMO_SETUP: { start: 10, end: 12, label: 'Demo-Formierung', ambient: 1.0 },
  ULTIMATUM: { start: 12, end: 13, label: 'Polizei-Ultimatum', ambient: 1.0 },
  DAY: { start: 13, end: 18, label: 'Tagbetrieb / Eskalation', ambient: 1.0 },
  EVENING: { start: 18, end: 22, label: 'Abenddämmerung', ambient: 0.6 },
  NIGHT: { start: 22, end: 6, label: 'Nachtruhe', ambient: 0.1 }
};

export class EventScheduler {
  private gameTimeSeconds: number = 36000; // Reset to 10:00 (Demo Setup Start)
  private speedMultiplier: number = 1;
  private isPaused: boolean = false;

  update(deltaMinutes: number) {
    if (this.isPaused) return;
    this.gameTimeSeconds = (this.gameTimeSeconds + deltaMinutes * this.speedMultiplier * 60) % 86400;
  }

  setSpeed(speed: number) {
    this.speedMultiplier = speed;
  }

  setPaused(paused: boolean) {
    this.isPaused = paused;
  }

  getSpeed() { return this.speedMultiplier; }
  getIsPaused() { return this.isPaused; }

  setGameTime(h: number, m: number, s: number = 0) {
    this.gameTimeSeconds = h * 3600 + m * 60 + s;
  }

  getCurrentPhase() {
    const hour = this.getHour();
    if (hour >= 6 && hour < 8) return EVENT_PHASES.MORNING;
    if (hour >= 8 && hour < 10) return EVENT_PHASES.RUSH_HOUR;
    if (hour >= 10 && hour < 12) return EVENT_PHASES.DEMO_SETUP;
    if (hour >= 12 && hour < 13) return EVENT_PHASES.ULTIMATUM;
    if (hour >= 13 && hour < 18) return EVENT_PHASES.DAY;
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
