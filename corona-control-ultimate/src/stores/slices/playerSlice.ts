import type { StateCreator } from 'zustand';
import type { GameStore } from '../types';

export const createPlayerSlice: StateCreator<GameStore, [], [], Pick<GameStore, 'player' | 'setPlayerPosition' | 'setPlayerHealth' | 'tensionLevel' | 'setTension' | 'toggleBinoculars'>> = (set) => ({
  player: {
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    isGrounded: true,
    isSprinting: false,
    isJumping: false,
    isDead: false,
    currentEquipmentSlot: 1,
    inventory: [],
    isUsingBinoculars: false,
  },
  
  tensionLevel: 0,

  setPlayerPosition: (pos) =>
    set((state) => ({ player: { ...state.player, position: pos } })),
    
  setPlayerHealth: (hp) =>
    set((state) => ({ player: { ...state.player, health: hp } })),
    
  setTension: (t) => set({ tensionLevel: t }),
  
  toggleBinoculars: () => set((state) => ({
      player: { ...state.player, isUsingBinoculars: !state.player.isUsingBinoculars }
  })),
});
