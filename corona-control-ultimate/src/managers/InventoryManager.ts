import { useGameStore } from '@/stores/gameStore';

export interface Item {
    id: string;
    name: string;
    type: 'WEAPON' | 'CONSUMABLE' | 'QUEST' | 'GEAR';
    maxStack: number;
    description: string;
    icon?: string;
    effect?: (targetId?: number) => void;
}

export interface InventorySlot {
    index: number;
    item: Item | null;
    quantity: number;
}

export class InventoryManager {
    private static instance: InventoryManager;
    private itemDatabase: Map<string, Item> = new Map();

    private constructor() {
        this.initializeItems();
    }

    public static getInstance(): InventoryManager {
        if (!InventoryManager.instance) {
            InventoryManager.instance = new InventoryManager();
        }
        return InventoryManager.instance;
    }

    private initializeItems() {
        this.registerItem({
            id: 'ITEM_BATON',
            name: 'Schlagstock',
            type: 'WEAPON',
            maxStack: 1,
            description: 'Standard-Polizeiausrüstung. Nicht tödlich.',
            effect: () => console.log('Equipped Baton')
        });

        this.registerItem({
            id: 'ITEM_MEDKIT',
            name: 'Erste-Hilfe-Set',
            type: 'CONSUMABLE',
            maxStack: 5,
            description: 'Heilt 50 HP.',
            effect: () => {
                useGameStore.getState().setHealth(100); // Full heal for simple logic
                console.log('Used Medkit');
            }
        });
    }

    public registerItem(item: Item) {
        this.itemDatabase.set(item.id, item);
    }

    public getItem(id: string): Item | undefined {
        return this.itemDatabase.get(id);
    }

    public addItem(itemId: string, amount: number = 1): boolean {
        const itemDef = this.getItem(itemId);
        if (!itemDef) return false;

        // Logic to add to Store Inventory Array
        // This is complex to do with Zustand direct manipulation outside store actions
        // Ideally, we'd have an 'addItem' action in the store. 
        // For now, we simulate success.
        console.log(`[Inventory] Added ${amount}x ${itemDef.name}`);
        useGameStore.getState().setPrompt(`ERHALTEN: ${amount}x ${itemDef.name}`);
        return true;
    }

    public useItem(index: number) {
        // Logic to use item at slot index
    }
}
