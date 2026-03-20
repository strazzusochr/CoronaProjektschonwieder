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
  setNPCs: (npcs: Record<string, NPCData>) => void;
  updateNPCs: (npcUpdates: Record<string, Partial<NPCData>>) => void;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
}

export const useGameStore = create<GameStore>((set) => ({
  npcs: {},
  connectionStatus: 'disconnected',

  setNPCs: (npcs) => set({ npcs }),

  updateNPCs: (npcUpdates) => 
    set((state) => {
      const newNpcs = { ...state.npcs };
      Object.entries(npcUpdates).forEach(([id, update]) => {
        // Upsert logic: Update existing or create new with defaults
        newNpcs[id] = { 
          ...(newNpcs[id] || { id, position: [0, 0, 0], action: 'IDLE', mood: 'NEUTRAL', type: 'civilian' }), 
          ...update 
        } as NPCData;
      });
      return { npcs: newNpcs };
    }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
}));
