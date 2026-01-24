import type { StateCreator } from 'zustand';
import type { GameStore } from '../types';

const INVENTORY_SIZE = 40;

export const createGameSlice: StateCreator<GameStore, [], [], Pick<GameStore,
    'gameState' | 'missions' | 'npcs' | 'markedNpcIds' | 'projectiles' | 'worldItems' |
    'startGame' | 'resetGame' | 'setPoints' | 'addPoints' | 'setHealth' | 'takeDamage' |
    'setTime' | 'updateMissionProgress' | 'nextMission' | 'setGameOver' | 'setVictory' |
    'startCutscene' | 'endCutscene' | 'setCutsceneTime' | 'setPrompt' | 'spawnWave' | 'addProjectile' |
    'removeProjectile' | 'spawnItem' | 'removeWorldItem' | 'saveGame' | 'loadGame' | 'markNpc' | 'updateNpc'
>> = (set, get) => ({
    gameState: {
        points: 0,
        health: 100,
        isGameOver: false,
        isVictory: false,
        dayTime: 1080, // 18:00 (in Minuten seit Mitternacht)
        currentMissionIndex: 0,
        isPlaying: false,
        activeCutscene: null,
        activePrompt: null,
        cutsceneTime: 0
    },
    npcs: [],
    markedNpcIds: [],
    missions: [
        { id: 1, type: 'REACH_TARGET', description: 'Beobachtungsposten Nordseite erreichen', targetAmount: 1, currentAmount: 0 },
        { id: 2, type: 'REACH_TARGET', description: 'Martin Krause identifizieren die Menge filmen', targetAmount: 1, currentAmount: 0 },
        { id: 3, type: 'DISPERSE_RIOTERS', description: 'Situation deeskalieren oder Randalierer zerstreuen', targetAmount: 5, currentAmount: 0 }
    ],

    projectiles: [],
    worldItems: [],

    startGame: () => set((state) => ({
        gameState: {
            ...state.gameState,
            isPlaying: true,
            isGameOver: false,
            isVictory: false,
            health: 100,
            points: 0,
            currentMissionIndex: 0
        },
        missions: state.missions.map(m => ({ ...m, currentAmount: 0 })),
        tensionLevel: 0,
        inventory: Array.from({ length: INVENTORY_SIZE }, (_, i) => {
            if (i === 0) {
                return {
                    index: i,
                    item: {
                        id: 'medkit', name: 'Medkit', type: 'CONSUMABLE', description: 'Heilt 50 HP',
                        maxStack: 5, quantity: 3, effect: { type: 'HEAL', value: 50 }
                    }
                };
            }
            if (i === 1) {
                return {
                    index: i,
                    item: {
                        id: 'molotov', name: 'Molotow', type: 'WEAPON', description: 'Brennt alles nieder',
                        maxStack: 10, quantity: 5
                    }
                }
            }
            return { index: i, item: null };
        }),
        worldItems: [
            { id: 'item1', itemId: 'medkit', position: [2, 0.5, 5] },
            { id: 'item2', itemId: 'stone', position: [-2, 0.5, 5] },
            // Barricades
            { id: 'b1', itemId: 'barricade', position: [0, 1, 10] },
            { id: 'b2', itemId: 'barricade', position: [2.5, 1, 10] },
            { id: 'b3', itemId: 'barricade', position: [-2.5, 1, 10] },
        ],
        projectiles: [],
        npcs: [
            { id: 9999, type: 'KRAUSE', position: [45.0, 0.5, -30.0], velocity: [0, 0, 0] as [number, number, number], rotation: 0, state: 'IDLE' },
            ...Array.from({ length: 500 }, (_, i) => ({
                id: i,
                type: Math.random() > 0.8 ? 'RIOTER' : 'CIVILIAN',
                position: [
                    (Math.random() - 0.5) * 150, // Größerer Bereich (150m) für LOD Test
                    1,
                    (Math.random() - 0.5) * 150
                ] as [number, number, number],
                velocity: [0, 0, 0] as [number, number, number],
                rotation: Math.random() * Math.PI * 2,
                state: 'IDLE'
            }))
        ]
    })),

    resetGame: () => set((state) => ({
        gameState: {
            ...state.gameState,
            isPlaying: false,
            isGameOver: false,
            isVictory: false
        }
    })),

    setPoints: (points) => set((state) => ({
        gameState: { ...state.gameState, points }
    })),

    addPoints: (amount) => set((state) => ({
        gameState: { ...state.gameState, points: state.gameState.points + amount }
    })),

    setTension: (tension: number) => set(() => ({
        tensionLevel: Math.min(100, Math.max(0, tension))
    })),

    setHealth: (health) => set((state) => ({
        gameState: { ...state.gameState, health }
    })),

    takeDamage: (amount) => set((state) => {
        const newHealth = Math.max(0, state.gameState.health - amount);
        return {
            gameState: {
                ...state.gameState,
                health: newHealth,
                isGameOver: newHealth <= 0
            }
        };
    }),

    setTime: (time) => set((state) => ({
        gameState: { ...state.gameState, dayTime: time }
    })),

    updateMissionProgress: (amount) => set((state) => {
        const currentMission = state.missions[state.gameState.currentMissionIndex];
        if (!currentMission) return {};

        const newMissions = state.missions.map((m, i) => {
            if (i === state.gameState.currentMissionIndex) {
                return { ...m, currentAmount: m.currentAmount + amount };
            }
            return m;
        });

        return { missions: newMissions };
    }),

    nextMission: () => set((state) => ({
        gameState: {
            ...state.gameState,
            currentMissionIndex: Math.min(state.gameState.currentMissionIndex + 1, state.missions.length)
        }
    })),

    setGameOver: (isOver) => set((state) => ({
        gameState: { ...state.gameState, isGameOver: isOver }
    })),

    setVictory: (isVictory) => set((state) => ({
        gameState: { ...state.gameState, isVictory: isVictory }
    })),

    startCutscene: (id: string) => set((state) => ({
        gameState: { ...state.gameState, activeCutscene: id }
    })),

    endCutscene: () => set((state) => ({
        gameState: { ...state.gameState, activeCutscene: null }
    })),

    setPrompt: (text: string | null) => set((state) => ({
        gameState: { ...state.gameState, activePrompt: text }
    })),

    setCutsceneTime: (time: number) => set((state) => ({
        gameState: { ...state.gameState, cutsceneTime: time }
    })),

    spawnWave: (count: number, type: string = 'TOURIST') => set((state) => {
        const newNpcs = Array.from({ length: count }, (_, i) => ({
            id: state.npcs.length + i,
            type: type,
            position: [
                (Math.random() - 0.5) * 40,
                0.5,
                (Math.random() - 0.5) * 40
            ] as [number, number, number]
        }));
        return { npcs: [...state.npcs, ...newNpcs] };
    }),

    markNpc: (id: number) => set((state) => ({
        markedNpcIds: [...state.markedNpcIds, id]
    })),

    updateNpc: (id: number, data: any) => set((state) => ({
        npcs: state.npcs.map(npc => npc.id === id ? { ...npc, ...data } : npc)
    })),

    addProjectile: (position, velocity, type = 'STONE') => set((state) => ({
        projectiles: [
            ...state.projectiles,
            { id: Date.now() + Math.random(), position, velocity, type }
        ]
    })),

    removeProjectile: (id) => set((state) => ({
        projectiles: state.projectiles.filter(p => p.id !== id)
    })),

    spawnItem: (itemId, position) => set((state) => ({
        worldItems: [
            ...state.worldItems,
            { id: Math.random().toString(36).substr(2, 9), itemId, position }
        ]
    })),

    removeWorldItem: (id) => set((state) => ({
        worldItems: state.worldItems.filter(item => item.id !== id)
    })),

    saveGame: () => {
        const state = get();
        const dataToSave = {
            gameState: state.gameState,
            missions: state.missions,
            inventory: state.inventory,
            player: state.player,
            worldItems: state.worldItems
        };
        localStorage.setItem('corona_control_save', JSON.stringify(dataToSave));
        console.log("Game Saved!");
    },

    loadGame: () => {
        const saved = localStorage.getItem('corona_control_save');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                set((state) => ({
                    ...state,
                    gameState: data.gameState,
                    missions: data.missions,
                    inventory: data.inventory,
                    player: { ...state.player, ...data.player },
                    worldItems: data.worldItems || [],
                    isInventoryOpen: false
                }));
                console.log("Game Loaded!");
                return true;
            } catch (e) {
                console.error("Failed to load save", e);
                return false;
            }
        }
        return false;
    },
});
