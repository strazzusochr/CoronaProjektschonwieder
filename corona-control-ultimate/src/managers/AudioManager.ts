import GameEventSystem from '@/systems/GameEventSystem';

class AudioManager {
    private static instance: AudioManager;
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;

    private constructor() {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.3; // Master volume
        } catch (e) {
            console.warn("AudioContext not supported", e);
        }
    }

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    private playTone(frequency: number, type: OscillatorType, duration: number, startTime: number = 0) {
        if (!this.audioContext || !this.masterGain) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime + startTime);

        gain.gain.setValueAtTime(0.5, this.audioContext.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.audioContext.currentTime + startTime);
        osc.stop(this.audioContext.currentTime + startTime + duration);
    }

    public playThrowSound(position?: [number, number, number]) {
        if (!this.audioContext) return;
        // Swoosh sound: rapid frequency drop
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.2);

        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.2);

        // AI Stimulus
        if (position) {
            GameEventSystem.getInstance().emit({
                type: 'AUDIO',
                position: position,
                intensity: 0.5,
                timestamp: performance.now(),
                tags: ['THROWN_OBJECT']
            });
        }
    }

    public playFootstep() {
        if (!this.audioContext) return;
        // Short noise burst for footstep
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        // Low frequency noise simulation
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.05);

        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.05);
    }

    public play3DTone(pos: [number, number, number], frequency: number, type: OscillatorType, duration: number) {
        if (!this.audioContext || !this.masterGain) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const panner = this.audioContext.createPanner();

        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 10000;
        panner.positionX.value = pos[0];
        panner.positionY.value = pos[1];
        panner.positionZ.value = pos[2];

        osc.type = type;
        osc.frequency.value = frequency;

        gain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterGain);

        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }

    public playHitSound() {
        if (!this.audioContext) return;
        // Crunch/Noise burst simulates impact
        this.playTone(150, 'sawtooth', 0.1);
        this.playTone(100, 'square', 0.1, 0.05);
    }

    public playMissionComplete() {
        // Positive Chime (Major Triad)
        this.playTone(440, 'sine', 0.5, 0);   // A4
        this.playTone(554, 'sine', 0.5, 0.2); // C#5
        this.playTone(659, 'sine', 1.0, 0.4); // E5
    }

    // --- Phase 13 Compliance Wrappers ---
    public playSound(soundName: string, volume: number = 1.0) {
        console.log(`[Audio] Playing: ${soundName} (Vol: ${volume})`);

        if (soundName === 'mission_success') this.playMissionComplete();
        else if (soundName === 'hit') this.playHitSound();
        else if (soundName === 'throw') this.playThrowSound();
        else if (soundName === 'footstep') this.playFootstep();
    }

    public playSound3D(soundName: string, position: [number, number, number], maxDist: number = 50) {
        // Map to existing WebAudio implementation
        if (soundName === 'hit') this.play3DTone(position, 150, 'sawtooth', 0.1);
        else if (soundName === 'throw') this.play3DTone(position, 600, 'sine', 0.2);

        console.log(`[Audio] Playing 3D: ${soundName} at [${position}]`);
    }

    public resume() {
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}

export default AudioManager;
