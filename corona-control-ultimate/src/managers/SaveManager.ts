/**
 * SaveManager - Save/Load System
 * Phase 21: Persistence
 * 
 * Features:
 * - Multiple Save Slots (3)
 * - Auto-Save nach Checkpoints
 * - Vollständige Spielstand-Serialisierung
 * - localStorage-basierte Persistenz
 */
import { useGameStore } from '@/stores/gameStore';
import { networkManager } from './NetworkManager';

export interface SaveData {
    version: string;
    timestamp: number;
    slotName: string;
    playtime: number; // Sekunden

    // Core Game State
    gameState: {
        points: number;
        health: number;
        dayTime: number;
        currentMissionIndex: number;
        tension: number;
    };

    // Player
    player: {
        position: [number, number, number];
        rotation: [number, number, number];
        health: number;
    };

    // Inventory
    inventory: Array<{
        index: number;
        item: {
            id: string;
            name: string;
            type: string;
            quantity: number;
        } | null;
    }>;

    // Equipment
    equipment: {
        head: string | null;
        body: string | null;
        mainHand: string | null;
        offHand: string | null;
    };

    // Quest Progress
    quests: Array<{
        id: string;
        state: string;
        currentStep?: number;
    }>;

    // Settings (nicht Teil des Spielstands, aber für Komfort)
    settings: {
        colorblindMode: string;
        ttsEnabled: boolean;
    };

    // NPCs (simplified)
    npcCount: number;

    // Checkpoints
    lastCheckpoint: string | null;
}

export interface SaveSlot {
    id: number;
    isEmpty: boolean;
    data: SaveData | null;
    thumbnailBase64?: string;
}

const SAVE_KEY_PREFIX = 'corona_control_save_';
const SAVE_VERSION = '1.0.0';
const MAX_SLOTS = 3;

class SaveManager {
    private static instance: SaveManager;
    private autoSaveInterval: number | null = null;
    private sessionStartTime: number = Date.now();
    private totalPlaytime: number = 0;

    private constructor() {
        // Load existing playtime
        const savedPlaytime = localStorage.getItem('corona_control_playtime');
        if (savedPlaytime) {
            this.totalPlaytime = parseInt(savedPlaytime, 10);
        }
    }

    public static getInstance(): SaveManager {
        if (!this.instance) {
            this.instance = new SaveManager();
        }
        return this.instance;
    }

    /**
     * Serialize current game state to SaveData
     */
    private serializeGameState(): SaveData {
        const store = useGameStore.getState();

        const currentPlaytime = Math.floor((Date.now() - this.sessionStartTime) / 1000);

        return {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            slotName: `Spielstand ${new Date().toLocaleString('de-DE')}`,
            playtime: this.totalPlaytime + currentPlaytime,

            gameState: {
                points: store.gameState.points,
                health: store.gameState.health,
                dayTime: store.gameState.dayTime,
                currentMissionIndex: store.gameState.currentMissionIndex,
                tension: store.tensionLevel ?? 0,
            },

            player: {
                position: store.player?.position ?? [0, 2, 0],
                rotation: [0, 0, 0], // TODO: Track rotation
                health: store.player?.health ?? 100,
            },

            inventory: store.inventory?.map(slot => ({
                index: slot.index,
                item: slot.item ? {
                    id: slot.item.id,
                    name: slot.item.name,
                    type: slot.item.type,
                    quantity: slot.item.quantity,
                } : null,
            })) ?? [],

            equipment: {
                head: store.equipment?.head?.id ?? null,
                body: store.equipment?.body?.id ?? null,
                mainHand: store.equipment?.mainHand?.id ?? null,
                offHand: store.equipment?.offHand?.id ?? null,
            },

            quests: [], // TODO: Integrate with QuestManager

            settings: {
                colorblindMode: store.settings?.colorblindMode ?? 'NONE',
                ttsEnabled: store.settings?.ttsEnabled ?? false,
            },

            npcCount: store.npcs?.length ?? 0,
            lastCheckpoint: null,
        };
    }

    /**
     * Save game to specified slot
     */
    public saveToSlot(slotId: number): boolean {
        if (slotId < 0 || slotId >= MAX_SLOTS) {
            console.error('Invalid save slot:', slotId);
            return false;
        }

        try {
            const saveData = this.serializeGameState();
            const key = `${SAVE_KEY_PREFIX}${slotId}`;
            localStorage.setItem(key, JSON.stringify(saveData));
            console.log(`[SaveManager] Saved to slot ${slotId}`);

            // Phase 25: Cloud Sync
            if (networkManager.isConnected) {
                networkManager.cloudSave(saveData);
            }

            return true;
        } catch (e) {
            console.error('[SaveManager] Save failed:', e);
            return false;
        }
    }

    /**
     * Load game from specified slot
     */
    public loadFromSlot(slotId: number): boolean {
        if (slotId < 0 || slotId >= MAX_SLOTS) {
            console.error('Invalid save slot:', slotId);
            return false;
        }

        try {
            const key = `${SAVE_KEY_PREFIX}${slotId}`;
            const savedJson = localStorage.getItem(key);

            if (!savedJson) {
                console.log(`[SaveManager] Slot ${slotId} is empty`);
                return false;
            }

            const saveData: SaveData = JSON.parse(savedJson);

            // Version check
            if (saveData.version !== SAVE_VERSION) {
                console.warn('[SaveManager] Save version mismatch, attempting migration...');
                // TODO: Implement migration logic
            }

            // Apply save data to store
            useGameStore.setState(state => ({
                gameState: {
                    ...state.gameState,
                    points: saveData.gameState.points,
                    health: saveData.gameState.health,
                    dayTime: saveData.gameState.dayTime,
                    currentMissionIndex: saveData.gameState.currentMissionIndex,
                    menuState: 'PLAYING',
                    isPlaying: true,
                },
                player: {
                    ...state.player,
                    position: saveData.player.position,
                    health: saveData.player.health,
                },
                tensionLevel: saveData.gameState.tension,
                settings: {
                    ...state.settings,
                    colorblindMode: saveData.settings.colorblindMode as any,
                    ttsEnabled: saveData.settings.ttsEnabled,
                },
            }));

            // Update playtime tracking
            this.totalPlaytime = saveData.playtime;
            this.sessionStartTime = Date.now();

            console.log(`[SaveManager] Loaded from slot ${slotId}`);
            return true;
        } catch (e) {
            console.error('[SaveManager] Load failed:', e);
            return false;
        }
    }

    /**
     * Get all save slots with their data
     */
    public getSaveSlots(): SaveSlot[] {
        const slots: SaveSlot[] = [];

        for (let i = 0; i < MAX_SLOTS; i++) {
            const key = `${SAVE_KEY_PREFIX}${i}`;
            const savedJson = localStorage.getItem(key);

            if (savedJson) {
                try {
                    const data: SaveData = JSON.parse(savedJson);
                    slots.push({
                        id: i,
                        isEmpty: false,
                        data: data,
                    });
                } catch {
                    slots.push({ id: i, isEmpty: true, data: null });
                }
            } else {
                slots.push({ id: i, isEmpty: true, data: null });
            }
        }

        return slots;
    }

    /**
     * Delete a save slot
     */
    public deleteSlot(slotId: number): boolean {
        const key = `${SAVE_KEY_PREFIX}${slotId}`;
        localStorage.removeItem(key);
        console.log(`[SaveManager] Deleted slot ${slotId}`);
        return true;
    }

    /**
     * Quick Save (to slot 0)
     */
    public quickSave(): boolean {
        return this.saveToSlot(0);
    }

    /**
     * Quick Load (from slot 0)
     */
    public quickLoad(): boolean {
        return this.loadFromSlot(0);
    }

    /**
     * Auto-Save (triggered by checkpoints)
     */
    public autoSave(): boolean {
        console.log('[SaveManager] Auto-save triggered');
        return this.saveToSlot(0); // Auto-save goes to slot 0
    }

    /**
     * Start periodic auto-save (every 5 minutes)
     */
    public startAutoSave(intervalMs: number = 300000) {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.autoSaveInterval = window.setInterval(() => {
            const menuState = useGameStore.getState().gameState.menuState;
            if (menuState === 'PLAYING') {
                this.autoSave();
            }
        }, intervalMs);
        console.log('[SaveManager] Auto-save started (interval: 5 min)');
    }

    /**
     * Stop auto-save
     */
    public stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    /**
     * Create checkpoint (named auto-save)
     */
    public checkpoint(name: string) {
        const saveData = this.serializeGameState();
        saveData.lastCheckpoint = name;

        const key = `${SAVE_KEY_PREFIX}checkpoint`;
        localStorage.setItem(key, JSON.stringify(saveData));
        console.log(`[SaveManager] Checkpoint created: ${name}`);
    }

    /**
     * Load from checkpoint
     */
    public loadCheckpoint(): boolean {
        const key = `${SAVE_KEY_PREFIX}checkpoint`;
        const savedJson = localStorage.getItem(key);

        if (!savedJson) return false;

        // Use same logic as loadFromSlot but from checkpoint key
        try {
            const saveData: SaveData = JSON.parse(savedJson);

            useGameStore.setState(state => ({
                gameState: {
                    ...state.gameState,
                    points: saveData.gameState.points,
                    health: saveData.gameState.health,
                    dayTime: saveData.gameState.dayTime,
                    currentMissionIndex: saveData.gameState.currentMissionIndex,
                    menuState: 'PLAYING',
                    isPlaying: true,
                },
                player: {
                    ...state.player,
                    position: saveData.player.position,
                    health: saveData.player.health,
                },
                tensionLevel: saveData.gameState.tension,
            }));

            console.log(`[SaveManager] Loaded checkpoint: ${saveData.lastCheckpoint}`);
            return true;
        } catch (e) {
            console.error('[SaveManager] Load checkpoint failed:', e);
            return false;
        }
    }

    /**
     * Format playtime for display
     */
    public formatPlaytime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes} min`;
    }

    /**
     * Phase 25: Apply data from cloud
     */
    public applyCloudData(data: SaveData) {
        console.log('[SaveManager] Applying cloud data...');
        // Simplified: Save to slot 0 and load it
        const key = `${SAVE_KEY_PREFIX}0`;
        localStorage.setItem(key, JSON.stringify(data));
        this.loadFromSlot(0);
        useGameStore.getState().setPrompt('☁️ Cloud-Stand geladen!');
        setTimeout(() => useGameStore.getState().setPrompt(null), 3000);
    }

    public syncFromCloud() {
        if (networkManager.isConnected) {
            networkManager.requestCloudData();
        }
    }
}

// Export singleton
export const saveManager = SaveManager.getInstance();

// Debug
(window as any).saveManager = saveManager;
