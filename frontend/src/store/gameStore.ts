import { create } from 'zustand';

export interface NPCData {
  id: string;
  position: [number, number, number];
  action: string;
  mood: string;
  type: string;
}

interface GameStore {
  npcs: Record<string, NPCData>;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  worldTime: string;
  worldPhase: string;
  worldAmbient: number;
  bakeryState: string;
  setNPCs: (npcs: Record<string, NPCData>) => void;
  updateNPCs: (npcUpdates: Record<string, Partial<NPCData>>) => void;
  setWorldState: (time: string, phase: string, ambient: number, bakery?: string) => void;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
}

export const useGameStore = create<GameStore>((set) => ({
  npcs: {},
  connectionStatus: 'disconnected',
  worldTime: '00:00',
  worldPhase: 'Initialisierung',
  worldAmbient: 0.5,
  bakeryState: 'CLOSED',

  setNPCs: (npcs) => set({ npcs }),

  updateNPCs: (npcUpdates) => 
    set((state) => {
      const newNpcs = { ...state.npcs };
      Object.entries(npcUpdates).forEach(([id, update]) => {
        newNpcs[id] = { 
          ...(newNpcs[id] || { id, position: [0, 0, 0], action: 'IDLE', mood: 'NEUTRAL', type: 'civilian' }), 
          ...update 
        } as NPCData;
      });
      return { npcs: newNpcs };
    }),

  setWorldState: (time, phase, ambient, bakery) => 
    set({ worldTime: time, worldPhase: phase, worldAmbient: ambient, bakeryState: bakery || 'CLOSED' }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
}));
