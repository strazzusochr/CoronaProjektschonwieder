import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';
import type { Item, CraftingRecipe } from '../types';

describe('InventorySlice', () => {
    beforeEach(() => {
        useGameStore.setState({
            inventory: Array.from({ length: 40 }, (_, i) => ({ index: i, item: null })),
            equipment: { head: null, body: null, mainHand: null, offHand: null },
            isInventoryOpen: false
        });
    });

    const testItem: Item = {
        id: 'test_sword',
        name: 'Test Sword',
        type: 'WEAPON',
        description: 'A test sword',
        maxStack: 1,
        quantity: 1,
        equippableSlot: 'MAIN_HAND',
        stats: { damage: 10 }
    };

    const materialItem: Item = {
        id: 'wood',
        name: 'Wood',
        type: 'MATERIAL',
        description: 'Some wood',
        maxStack: 10,
        quantity: 5
    };

    it('should add an item to inventory', () => {
        const store = useGameStore.getState();
        store.addItem(testItem);

        const inventory = useGameStore.getState().inventory;
        const slot = inventory.find(s => s.item?.id === 'test_sword');
        expect(slot).toBeDefined();
        expect(slot?.item?.quantity).toBe(1);
    });

    it('should equip an item', () => {
        const store = useGameStore.getState();
        store.addItem(testItem);

        // Find slot index
        const inventory = useGameStore.getState().inventory;
        const slotIndex = inventory.findIndex(s => s.item?.id === 'test_sword');

        store.equipItem(slotIndex);

        const equipment = useGameStore.getState().equipment;
        expect(equipment.mainHand?.id).toBe('test_sword');

        // Should be removed from inventory (since quantity was 1)
        const newInventory = useGameStore.getState().inventory;
        expect(newInventory[slotIndex].item).toBeNull();
    });

    it('should unequip an item', () => {
        const store = useGameStore.getState();
        // Manually set equipment
        useGameStore.setState(state => ({
            equipment: { ...state.equipment, mainHand: { ...testItem } }
        }));

        store.unequipItem('mainHand');

        const equipment = useGameStore.getState().equipment;
        expect(equipment.mainHand).toBeNull();

        const inventory = useGameStore.getState().inventory;
        const slot = inventory.find(s => s.item?.id === 'test_sword');
        expect(slot).toBeDefined();
    });

    it('should craft an item', () => {
        const store = useGameStore.getState();
        store.addItem({ ...materialItem, quantity: 5 }); // Add 5 wood

        const recipe: CraftingRecipe = {
            id: 'plank_recipe',
            name: 'Plank',
            resultId: 'plank',
            resultCount: 1,
            ingredients: [{ itemId: 'wood', count: 2 }]
        };

        // We need to mock the result item addition or assume craftItem handles it.
        // In our implementation, craftItem just consumes ingredients and returns true.
        // It doesn't add the result yet because we didn't implement the item lookup.
        // But let's verify ingredients are consumed.

        const success = store.craftItem(recipe);
        expect(success).toBe(true);

        const inventory = useGameStore.getState().inventory;
        const woodSlot = inventory.find(s => s.item?.id === 'wood');
        expect(woodSlot?.item?.quantity).toBe(3); // 5 - 2 = 3
    });
});
