
import { useGameStore } from '@/stores/gameStore';

class AccessibilityManager {
    private static instance: AccessibilityManager;
    private synth: SpeechSynthesis;
    private voice: SpeechSynthesisVoice | null = null;

    private constructor() {
        this.synth = window.speechSynthesis;
        // Wait for voices to load
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = this.initVoice.bind(this);
        }
        this.initVoice();
    }

    private initVoice() {
        const voices = this.synth.getVoices();
        // Prefer German voice
        this.voice = voices.find(v => v.lang.startsWith('de')) || voices[0] || null;
        console.log('Accessibility: TTS Voice set to', this.voice?.name);
    }

    public static getInstance(): AccessibilityManager {
        if (!AccessibilityManager.instance) {
            AccessibilityManager.instance = new AccessibilityManager();
        }
        return AccessibilityManager.instance;
    }

    public speak(text: string, force: boolean = false): void {
        const settings = useGameStore.getState().settings;

        if (!settings.ttsEnabled && !force) return;

        // Cancel previous speech to avoid queue buildup
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        if (this.voice) utterance.voice = this.voice;

        // Adjust speed/pitch if needed (could be settings too)
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        this.synth.speak(utterance);
    }

    public stop(): void {
        this.synth.cancel();
    }
}

export default AccessibilityManager;
