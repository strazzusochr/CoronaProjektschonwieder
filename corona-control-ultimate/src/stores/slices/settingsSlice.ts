import type { StateCreator } from 'zustand';
import type { GameStore } from '../types';

export const createSettingsSlice: StateCreator<GameStore, [], [], Pick<GameStore, 'settings' | 'setVolume' | 'setGraphicsQuality' | 'debugMode' | 'toggleDebug'>> = (set) => ({
  settings: {
      masterVolume: 1.0,
      musicVolume: 0.5,
      sfxVolume: 1.0,
      graphicsQuality: 'HIGH'
  },
  
  debugMode: {
      physics: false,
      fps: false
  },

  setVolume: (type, value) => set((state) => {
      const newSettings = { ...state.settings };
      if (type === 'MASTER') newSettings.masterVolume = value;
      if (type === 'MUSIC') newSettings.musicVolume = value;
      if (type === 'SFX') newSettings.sfxVolume = value;
      return { settings: newSettings };
  }),

  setGraphicsQuality: (quality) => set((state) => ({
      settings: { ...state.settings, graphicsQuality: quality }
  })),

  toggleDebug: (type) => set((state) => ({
      debugMode: { 
          ...state.debugMode, 
          [type.toLowerCase()]: !state.debugMode[type.toLowerCase() as 'physics' | 'fps'] 
      }
  })),
});
