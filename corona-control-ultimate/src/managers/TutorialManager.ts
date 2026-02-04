/**
 * TutorialManager - Interaktives Tutorial-System
 * Phase 20: Tutorial-System
 */
import { create } from 'zustand';
import { useGameStore } from '@/stores/gameStore';

export interface TutorialStep {
    id: string;
    title: string;
    description: string;
    action: string; // z.B. 'PRESS_W', 'PRESS_TAB', 'CLICK_LEFT'
    highlightElement?: string; // CSS-Selektor für UI-Highlight
    position?: 'TOP' | 'BOTTOM' | 'CENTER';
    autoAdvance?: boolean; // Automatisch weiter nach Aktion
    timeout?: number; // Optional: Auto-Skip nach X ms
}

interface TutorialState {
    isActive: boolean;
    currentStepIndex: number;
    steps: TutorialStep[];
    completedSteps: string[];

    startTutorial: () => void;
    advanceStep: () => void;
    completeStep: (stepId: string) => void;
    skipTutorial: () => void;
    getCurrentStep: () => TutorialStep | null;
}

// Tutorial-Schritte für Mission 01
const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: 'STEP_WELCOME',
        title: 'Willkommen bei Corona Control',
        description: 'Dieses Tutorial führt dich durch die Grundlagen des Spiels.',
        action: 'CLICK_CONTINUE',
        position: 'CENTER',
    },
    {
        id: 'STEP_MOVEMENT',
        title: 'Bewegung',
        description: 'Verwende WASD um dich zu bewegen. W = Vorwärts, S = Rückwärts, A = Links, D = Rechts.',
        action: 'PRESS_WASD',
        position: 'BOTTOM',
        autoAdvance: true,
    },
    {
        id: 'STEP_LOOK',
        title: 'Kamera',
        description: 'Bewege die Maus um dich umzusehen. Klicke ins Spiel, um die Maussteuerung zu aktivieren.',
        action: 'MOVE_MOUSE',
        position: 'BOTTOM',
        timeout: 5000,
    },
    {
        id: 'STEP_INVENTORY',
        title: 'Inventar',
        description: 'Drücke TAB um dein Inventar zu öffnen. Hier siehst du deine Ausrüstung und Items.',
        action: 'PRESS_TAB',
        highlightElement: '.inventory-panel',
        position: 'TOP',
        autoAdvance: true,
    },
    {
        id: 'STEP_PAUSE',
        title: 'Pause-Menü',
        description: 'Drücke ESC um das Spiel zu pausieren. Von dort erreichst du auch die Einstellungen.',
        action: 'PRESS_ESCAPE',
        position: 'TOP',
        autoAdvance: true,
    },
    {
        id: 'STEP_INTERACT',
        title: 'Interaktion',
        description: 'Nähere dich NPCs und drücke E um mit ihnen zu interagieren.',
        action: 'PRESS_E',
        position: 'CENTER',
    },
    {
        id: 'STEP_COMPLETE',
        title: 'Tutorial Abgeschlossen!',
        description: 'Du kennst nun die Grundlagen. Viel Erfolg bei deiner Mission!',
        action: 'CLICK_CONTINUE',
        position: 'CENTER',
    },
];

export const useTutorialStore = create<TutorialState>((set, get) => ({
    isActive: false,
    currentStepIndex: 0,
    steps: TUTORIAL_STEPS,
    completedSteps: [],

    startTutorial: () => {
        console.log('Tutorial gestartet');
        set({ isActive: true, currentStepIndex: 0, completedSteps: [] });

        // Zeige ersten Schritt als Prompt
        const firstStep = TUTORIAL_STEPS[0];
        useGameStore.getState().setPrompt(firstStep.description);
    },

    advanceStep: () => {
        const { currentStepIndex, steps } = get();
        const nextIndex = currentStepIndex + 1;

        if (nextIndex >= steps.length) {
            // Tutorial beendet
            set({ isActive: false });
            useGameStore.getState().setPrompt(null);
            console.log('Tutorial abgeschlossen!');
            return;
        }

        set({ currentStepIndex: nextIndex });

        // Update Prompt
        const nextStep = steps[nextIndex];
        useGameStore.getState().setPrompt(nextStep.description);
    },

    completeStep: (stepId: string) => {
        const { completedSteps, steps, currentStepIndex, advanceStep } = get();

        if (completedSteps.includes(stepId)) return;

        set({ completedSteps: [...completedSteps, stepId] });
        console.log(`Tutorial-Schritt abgeschlossen: ${stepId}`);

        // Auto-Advance wenn konfiguriert
        const currentStep = steps[currentStepIndex];
        if (currentStep && currentStep.id === stepId && currentStep.autoAdvance) {
            setTimeout(() => advanceStep(), 500);
        }
    },

    skipTutorial: () => {
        set({ isActive: false, currentStepIndex: 0 });
        useGameStore.getState().setPrompt(null);
        console.log('Tutorial übersprungen');
    },

    getCurrentStep: () => {
        const { isActive, currentStepIndex, steps } = get();
        if (!isActive || currentStepIndex >= steps.length) return null;
        return steps[currentStepIndex];
    },
}));

// Input-Listener für Tutorial-Aktionen
export function initTutorialInputListener() {
    const handleKeyDown = (e: KeyboardEvent) => {
        const store = useTutorialStore.getState();
        if (!store.isActive) return;

        const currentStep = store.getCurrentStep();
        if (!currentStep) return;

        switch (currentStep.action) {
            case 'PRESS_WASD':
                if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
                    store.completeStep(currentStep.id);
                }
                break;
            case 'PRESS_TAB':
                if (e.key === 'Tab') {
                    store.completeStep(currentStep.id);
                }
                break;
            case 'PRESS_ESCAPE':
                if (e.key === 'Escape') {
                    store.completeStep(currentStep.id);
                }
                break;
            case 'PRESS_E':
                if (e.key.toLowerCase() === 'e') {
                    store.completeStep(currentStep.id);
                }
                break;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}

// Debug
(window as any).tutorialStore = useTutorialStore;
