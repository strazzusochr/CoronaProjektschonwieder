import { create } from 'zustand';

export interface NPCData {
  id: string;
  position: [number, number, number];
  action: string;
  mood: string;
  type: 'civilian' | 'demonstrator' | 'official';
}

interface GameState {
  npcs: Record<string, NPCData>;
  updateNPCs: (npcUpdates: Record<string, Partial<NPCData>>) => void;
  setNPCs: (npcs: Record<string, NPCData>) => void;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
}

export const useGameStore = create<GameState>((set) => ({
  npcs: {},
  connectionStatus: 'connecting',
  
  updateNPCs: (npcUpdates) => 
    set((state) => {
      const newNpcs = { ...state.npcs };
      Object.entries(npcUpdates).forEach(([id, update]) => {
        if (newNpcs[id]) {
          newNpcs[id] = { ...newNpcs[id], ...update };
        }
      });
      return { npcs: newNpcs };
    }),

  setNPCs: (npcs) => set({ npcs }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
}));
