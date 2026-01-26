
import { create } from 'zustand';
import type { DialogTree, DialogNode, DialogChoice } from '@/types/DialogTypes';
import { useGameStore } from '@/stores/gameStore';

interface DialogState {
    activeDialog: DialogTree | null;
    currentNode: DialogNode | null;
    history: string[]; // Node IDs
    isOpen: boolean;

    startDialog: (tree: DialogTree) => void;
    advance: (choiceIndex?: number) => void;
    closeDialog: () => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
    activeDialog: null,
    currentNode: null,
    history: [],
    isOpen: false,

    startDialog: (tree: DialogTree) => {
        console.log(`Starting Dialog: ${tree.id}`);
        set({
            activeDialog: tree,
            currentNode: tree.nodes[tree.rootNodeId],
            history: [tree.rootNodeId],
            isOpen: true
        });

        // Pause Game?
        // useGameStore.getState().setPaused(true);
    },

    advance: (choiceIndex?: number) => {
        const { activeDialog, currentNode } = get();
        if (!activeDialog || !currentNode) return;

        let nextNodeId: string | undefined;

        if (currentNode.type === 'NPC') {
            nextNodeId = currentNode.nextNodeId;
        } else if (currentNode.type === 'PLAYER_CHOICE' && choiceIndex !== undefined && currentNode.choices) {
            const choice = currentNode.choices[choiceIndex];

            // Handle Skill Check
            if (choice.skillCheck) {
                const roll = Math.random() * 10; // Simple D10 roll
                const success = roll >= choice.skillCheck.difficulty;
                console.log(`Skill Check: ${choice.skillCheck.skillType} (Diff: ${choice.skillCheck.difficulty}) -> Rolled: ${roll.toFixed(1)} -> ${success ? 'SUCCESS' : 'FAIL'}`);
                nextNodeId = success ? choice.skillCheck.successNodeId : choice.skillCheck.failureNodeId;
            } else {
                nextNodeId = choice.nextNodeId;
            }

            // Handle Consequences
            if (choice.consequences) {
                if (choice.consequences.setFlag) {
                    console.log(`Flag Set: ${choice.consequences.setFlag}`);
                    // TODO: Set flag in Quest/Game Manager
                }
            }
        } else if (currentNode.type === 'ACTION') {
            if (currentNode.actions) currentNode.actions();
            nextNodeId = currentNode.nextNodeId;
        }

        if (nextNodeId) {
            const nextNode = activeDialog.nodes[nextNodeId];
            if (nextNode) {
                set(state => ({
                    currentNode: nextNode,
                    history: [...state.history, nextNodeId]
                }));

                // Auto-advance Action nodes
                if (nextNode.type === 'ACTION') {
                    get().advance();
                }
            } else {
                // End of dialog
                get().closeDialog();
            }
        } else {
            get().closeDialog();
        }
    },

    closeDialog: () => {
        console.log('Dialog Closed');
        set({ isOpen: false, activeDialog: null, currentNode: null });
        // useGameStore.getState().setPaused(false);
    }
}));

// Debug Access
(window as any).dialogStore = useDialogStore;
