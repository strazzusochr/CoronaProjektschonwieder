/**
 * ContextualHints - Intelligente Hilfe-Popups
 * Phase 20.2: Contextual Hints
 * 
 * Zeigt Kontext-abhängige Tipps basierend auf:
 * - Spieler-Inaktivität
 * - Nähe zu interaktiven Objekten
 * - Gamestate (niedrige Gesundheit, voller Inventar etc.)
 */
import { useGameStore } from '@/stores/gameStore';

export interface ContextHint {
    id: string;
    condition: () => boolean;
    message: string;
    priority: number; // Höher = wichtiger
    cooldownMs: number; // Wie lange bis Hint wieder erscheinen kann
    category: 'MOVEMENT' | 'COMBAT' | 'INVENTORY' | 'INTERACTION' | 'WARNING';
}

class ContextualHintsManager {
    private static instance: ContextualHintsManager;
    private hints: ContextHint[] = [];
    private lastShownHints: Map<string, number> = new Map(); // id -> timestamp
    private inactivityTimer: number | null = null;
    private lastPlayerMoveTime: number = Date.now();

    private constructor() {
        this.registerDefaultHints();
        this.startMonitoring();
    }

    public static getInstance(): ContextualHintsManager {
        if (!this.instance) {
            this.instance = new ContextualHintsManager();
        }
        return this.instance;
    }

    private registerDefaultHints() {
        this.hints = [
            // Inaktivitäts-Hints
            {
                id: 'HINT_INACTIVE_MOVEMENT',
                condition: () => Date.now() - this.lastPlayerMoveTime > 10000,
                message: 'Tipp: Benutze WASD um dich zu bewegen.',
                priority: 5,
                cooldownMs: 60000,
                category: 'MOVEMENT',
            },
            {
                id: 'HINT_INACTIVE_LOOK',
                condition: () => Date.now() - this.lastPlayerMoveTime > 15000,
                message: 'Tipp: Bewege die Maus um dich umzusehen.',
                priority: 4,
                cooldownMs: 60000,
                category: 'MOVEMENT',
            },

            // Gesundheits-Warnung
            {
                id: 'HINT_LOW_HEALTH',
                condition: () => {
                    const hp = useGameStore.getState().gameState.health;
                    return hp < 30;
                },
                message: '⚠️ Warnung: Deine Gesundheit ist niedrig! Suche Deckung.',
                priority: 10,
                cooldownMs: 30000,
                category: 'WARNING',
            },

            // Inventar-Tipps
            {
                id: 'HINT_OPEN_INVENTORY',
                condition: () => {
                    const items = useGameStore.getState().inventory?.items || [];
                    return items.length > 0 && !useGameStore.getState().gameState.isInventoryOpen;
                },
                message: 'Tipp: Drücke TAB um dein Inventar zu öffnen.',
                priority: 3,
                cooldownMs: 120000,
                category: 'INVENTORY',
            },

            // Combat-Tipps
            {
                id: 'HINT_COMBAT_CLICK',
                condition: () => {
                    // Wenn Spannung hoch, aber Spieler nicht kämpft
                    const tension = useGameStore.getState().gameState.tension ?? 0;
                    return tension > 50;
                },
                message: 'Tipp: Linksklick wirft einen Molotow-Cocktail.',
                priority: 6,
                cooldownMs: 90000,
                category: 'COMBAT',
            },

            // Interaktions-Tipps
            {
                id: 'HINT_INTERACT_NPC',
                condition: () => {
                    // Wenn Spieler in der Nähe eines NPC ist (simplified check)
                    const nearNPC = useGameStore.getState().gameState.nearbyInteractable;
                    return nearNPC === 'NPC';
                },
                message: 'Tipp: Drücke E um mit dem NPC zu sprechen.',
                priority: 7,
                cooldownMs: 30000,
                category: 'INTERACTION',
            },
        ];
    }

    private startMonitoring() {
        // Check hints every 2 seconds
        setInterval(() => this.checkHints(), 2000);

        // Track player movement
        window.addEventListener('keydown', (e) => {
            if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
                this.lastPlayerMoveTime = Date.now();
            }
        });

        window.addEventListener('mousemove', () => {
            this.lastPlayerMoveTime = Date.now();
        });
    }

    private checkHints() {
        // Nicht zeigen wenn nicht im Spiel
        const menuState = useGameStore.getState().gameState.menuState;
        if (menuState !== 'PLAYING') return;

        const now = Date.now();
        let bestHint: ContextHint | null = null;

        for (const hint of this.hints) {
            // Check cooldown
            const lastShown = this.lastShownHints.get(hint.id) ?? 0;
            if (now - lastShown < hint.cooldownMs) continue;

            // Check condition
            try {
                if (hint.condition()) {
                    if (!bestHint || hint.priority > bestHint.priority) {
                        bestHint = hint;
                    }
                }
            } catch (e) {
                // Condition threw error, skip
            }
        }

        if (bestHint) {
            this.showHint(bestHint);
        }
    }

    private showHint(hint: ContextHint) {
        console.log(`[ContextHint] ${hint.message}`);
        this.lastShownHints.set(hint.id, Date.now());

        // Use existing activePrompt system to display
        useGameStore.getState().setActivePrompt(hint.message);

        // Auto-clear after 5 seconds
        setTimeout(() => {
            const currentPrompt = useGameStore.getState().gameState.activePrompt;
            if (currentPrompt === hint.message) {
                useGameStore.getState().setActivePrompt(null);
            }
        }, 5000);
    }

    public registerHint(hint: ContextHint) {
        this.hints.push(hint);
    }

    public resetCooldowns() {
        this.lastShownHints.clear();
    }
}

// Auto-initialize
export const contextualHints = ContextualHintsManager.getInstance();

// Debug
(window as any).contextualHints = contextualHints;
