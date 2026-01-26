import type { StateCreator } from 'zustand';
import type { GameStore } from '../types';

const INVENTORY_SIZE = 40;

export const createInventorySlice: StateCreator<GameStore, [], [], Pick<GameStore, 'inventory' | 'equipment' | 'isInventoryOpen' | 'toggleInventory' | 'addItem' | 'removeItem' | 'useItem' | 'equipItem' | 'unequipItem' | 'craftItem'>> = (set, get) => ({
    inventory: Array.from({ length: INVENTORY_SIZE }, (_, i) => ({ index: i, item: null })),
    equipment: {
        head: null,
        body: null,
        mainHand: null,
        offHand: null,
    },
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

            // 1. Check if equippable
            if (item.equippableSlot) {
                state.equipItem(slotIndex);
                return;
            }

            // 2. Check if consumable
            if (item.effect) {
                if (item.effect.type === 'HEAL') {
                    const currentHealth = state.gameState.health;
                    if (currentHealth < 100) {
                        state.setHealth(Math.min(100, currentHealth + item.effect.value));
                        state.removeItem(slotIndex, 1);
                        console.log(`Used ${item.name}, healed for ${item.effect.value}`);
                    }
                } else if (item.effect.type === 'RESTORE_STAMINA') {
                    console.log(`Used ${item.name}, restored stamina`);
                    state.removeItem(slotIndex, 1);
                }
            }
        }
    },

    equipItem: (slotIndex) => {
        const state = get();
        const inventory = [...state.inventory];
        const equipment = { ...state.equipment };
        const itemToEquip = inventory[slotIndex]?.item;

        if (!itemToEquip || !itemToEquip.equippableSlot) return;

        // Map Enum to Key
        const slotMap: Record<string, keyof typeof equipment> = {
            'HEAD': 'head',
            'BODY': 'body',
            'MAIN_HAND': 'mainHand',
            'OFF_HAND': 'offHand'
        };

        const targetSlot = slotMap[itemToEquip.equippableSlot];
        if (!targetSlot) return;

        const currentlyEquipped = equipment[targetSlot];

        // If there is something equipped, unequip it first (put back in inventory)
        if (currentlyEquipped) {
            // If we are equipping from a stack > 1, we can't just swap.
            if (itemToEquip.quantity > 1) {
                // Reduce stack
                inventory[slotIndex].item = { ...itemToEquip, quantity: itemToEquip.quantity - 1 };
                // Add unequipped item to inventory (might fail if full)
                const added = state.addItem(currentlyEquipped);
                if (!added) {
                    console.warn("Inventory full, cannot unequip current item.");
                    return;
                }
            } else {
                // Exact swap
                inventory[slotIndex].item = currentlyEquipped;
            }
        } else {
            // Nothing equipped, just remove from inventory
            if (itemToEquip.quantity > 1) {
                inventory[slotIndex].item = { ...itemToEquip, quantity: itemToEquip.quantity - 1 };
            } else {
                inventory[slotIndex].item = null;
            }
        }

        // Set equipment
        equipment[targetSlot] = { ...itemToEquip, quantity: 1 };

        set({ inventory, equipment });
        console.log(`Equipped ${itemToEquip.name} to ${targetSlot}`);
    },

    unequipItem: (slot) => {
        const state = get();
        const equipment = { ...state.equipment };
        const itemToUnequip = equipment[slot];

        if (!itemToUnequip) return;

        // Try to add to inventory
        const added = state.addItem(itemToUnequip);
        if (added) {
            equipment[slot] = null;
            set({ equipment });
            console.log(`Unequipped ${itemToUnequip.name} from ${slot}`);
        } else {
            console.warn("Inventory full, cannot unequip.");
        }
    },

    craftItem: (recipe) => {
        const state = get();
        const inventory = state.inventory;

        // 1. Check ingredients
        for (const ing of recipe.ingredients) {
            const totalCount = inventory.reduce((acc, slot) => {
                if (slot.item && slot.item.id === ing.itemId) {
                    return acc + slot.item.quantity;
                }
                return acc;
            }, 0);

            if (totalCount < ing.count) {
                console.log(`Missing ingredients for ${recipe.name}: ${ing.itemId}`);
                return false;
            }
        }

        // 2. Consume ingredients
        const newInventory = inventory.map(slot => ({ ...slot, item: slot.item ? { ...slot.item } : null }));

        for (const ing of recipe.ingredients) {
            let remainingToRemove = ing.count;
            for (const slot of newInventory) {
                if (slot.item && slot.item.id === ing.itemId) {
                    const take = Math.min(slot.item.quantity, remainingToRemove);
                    slot.item.quantity -= take;
                    remainingToRemove -= take;
                    if (slot.item.quantity <= 0) {
                        slot.item = null;
                    }
                    if (remainingToRemove <= 0) break;
                }
            }
        }

        // 3. Add result (Placeholder logic)
        set({ inventory: newInventory });
        return true;
    }
});
