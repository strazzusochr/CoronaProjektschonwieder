import type { StateCreator } from 'zustand';
import type { GameStore } from '../types';

const INVENTORY_SIZE = 40;

export const createInventorySlice: StateCreator<GameStore, [], [], Pick<GameStore, 'inventory' | 'isInventoryOpen' | 'toggleInventory' | 'addItem' | 'removeItem' | 'useItem'>> = (set, get) => ({
  inventory: Array.from({ length: INVENTORY_SIZE }, (_, i) => ({ index: i, item: null })),
  isInventoryOpen: false,

  toggleInventory: () => set((state) => ({ isInventoryOpen: !state.isInventoryOpen })),

  addItem: (newItem) => {
      const state = get();
      const inventory = [...state.inventory];
      
      const existingSlot = inventory.find(slot => 
          slot.item && 
          slot.item.id === newItem.id && 
          slot.item.quantity < slot.item.maxStack
      );

      if (existingSlot && existingSlot.item) { 
          const space = existingSlot.item.maxStack - existingSlot.item.quantity;
          const toAdd = Math.min(space, newItem.quantity);
          
          existingSlot.item = { 
              ...existingSlot.item, 
              quantity: existingSlot.item.quantity + toAdd 
          };
          
          newItem.quantity -= toAdd;
          if (newItem.quantity <= 0) {
              set({ inventory });
              return true;
          }
      }

      const emptySlot = inventory.find(slot => slot.item === null);
      if (emptySlot) {
          emptySlot.item = { ...newItem };
          set({ inventory });
          return true;
      }

      return false; 
  },

  removeItem: (slotIndex, amount = 1) => {
      const state = get();
      const inventory = [...state.inventory];
      const slot = inventory[slotIndex];

      if (slot && slot.item) {
          if (slot.item.quantity > amount) {
              slot.item = { ...slot.item, quantity: slot.item.quantity - amount };
          } else {
              slot.item = null;
          }
          set({ inventory });
      }
  },

  useItem: (slotIndex) => {
      const state = get();
      const slot = state.inventory[slotIndex];
      
      if (slot && slot.item) {
          const item = slot.item;
          if (item.effect) {
              if (item.effect.type === 'HEAL') {
                  const currentHealth = state.gameState.health;
                  if (currentHealth < 100) {
                      state.setHealth(Math.min(100, currentHealth + item.effect.value));
                      state.removeItem(slotIndex, 1);
                      console.log(`Used ${item.name}, healed for ${item.effect.value}`);
                  }
              }
          }
      }
  },
});
