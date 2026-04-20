import { create } from 'zustand';

export interface NPCData {
  id: string;
  position: [number, number, number];
  action: string;
  mood: string;
  type: string;
  path?: [number, number, number][];
  pathIndex?: number;
}

interface GameStore {
  npcs: Record<string, NPCData>;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  worldTime: string;
  worldPhase: string;
  worldAmbient: number;
  bakeryState: string;
  tension: number;
  emergency: string;
  npcTypeCount: Record<string, number>;
  simSpeed: number;
  isPaused: boolean;
  isStreamingMode: boolean;
  npcPool: Record<string, NPCData>; // Non-reactive data pool for high-frequency updates
  setStreamingMode: (value: boolean) => void;
  setNPCs: (npcs: Record<string, NPCData>) => void;
  updateNPCs: (npcUpdates: Record<string, Partial<NPCData>>) => void;
  setWorldState: (time: string, phase: string, ambient: number, bakery?: string) => void;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
  setTension: (tension: number) => void;
  setEmergency: (level: string) => void;
  setSimData: (npcTypeCount: Record<string, number>, simSpeed: number, isPaused: boolean) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  npcs: {},
  npcPool: {},
  connectionStatus: 'disconnected',
  worldTime: '00:00',
  worldPhase: 'Initialisierung',
  worldAmbient: 0.5,
  bakeryState: 'CLOSED',
  tension: 0,
  emergency: 'NORMAL',
  npcTypeCount: {},
  simSpeed: 1,
  isPaused: false,
  isStreamingMode: new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('streaming') === 'true',

  setStreamingMode: (value) => set({ isStreamingMode: value }),

  // setNPCs updates the non-reactive pool for performance.
  // We ONLY do this on the local client (isStreamingMode: false) for 3D state.
  // The Cloud Renderer handles its own internal sim state.
  setNPCs: (npcs) => {
    const state = get();
    if (state.isStreamingMode) return; // Thermal Guard (Cloud Renderer doesn't need store NPCs)
    state.npcPool = npcs;
    
    if (Object.keys(state.npcs).length !== Object.keys(npcs).length) {
      set({ npcs });
    }
  },

  updateNPCs: (npcUpdates) => {
    const state = get();
    if (state.isStreamingMode) return; // Thermal Guard
    Object.entries(npcUpdates).forEach(([id, update]) => {
      state.npcPool[id] = { 
        ...(state.npcPool[id] || { id, position: [0, 0, 0], action: 'IDLE', mood: 'NEUTRAL', type: 'civilian' }), 
        ...update 
      } as NPCData;
    });
  },

  setWorldState: (time, phase, ambient, bakery) => 
    set({ worldTime: time, worldPhase: phase, worldAmbient: ambient, bakeryState: bakery || 'CLOSED' }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setTension: (tension) => set({ tension }),
  setEmergency: (emergency) => set({ emergency }),
  setSimData: (npcTypeCount, simSpeed, isPaused) => set({ npcTypeCount, simSpeed, isPaused }),
}));
