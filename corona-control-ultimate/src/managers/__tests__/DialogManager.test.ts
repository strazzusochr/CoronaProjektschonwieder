
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDialogStore } from '../DialogManager';
import { DialogTree } from '@/types/DialogTypes';

// Mock GameStore if needed (but DialogManager is mostly independent)

const TestDialog: DialogTree = {
    id: 'test_dialog',
    rootNodeId: 'node_1',
    nodes: {
        'node_1': {
            id: 'node_1',
            type: 'NPC',
            text: 'Hello',
            nextNodeId: 'node_2'
        },
        'node_2': {
            id: 'node_2',
            type: 'PLAYER_CHOICE',
            choices: [
                { text: 'Option A', nextNodeId: 'node_a' },
                {
                    text: 'Option B (Skill)',
                    nextNodeId: 'dummy',
                    skillCheck: {
                        skillType: 'TEST_SKILL',
                        difficulty: 0, // Always succeed
                        successNodeId: 'node_success',
                        failureNodeId: 'node_fail'
                    }
                }
            ]
        },
        'node_a': { id: 'node_a', type: 'NPC', text: 'You chose A' },
        'node_success': { id: 'node_success', type: 'NPC', text: 'Skill Success' },
        'node_fail': { id: 'node_fail', type: 'NPC', text: 'Skill Fail' }
    }
};

describe('DialogManager', () => {
    beforeEach(() => {
        useDialogStore.setState({
            activeDialog: null,
            currentNode: null,
            history: [],
            isOpen: false
        });
    });

    it('should start a dialog correctly', () => {
        useDialogStore.getState().startDialog(TestDialog);
        const state = useDialogStore.getState();

        expect(state.isOpen).toBe(true);
        expect(state.activeDialog?.id).toBe('test_dialog');
        expect(state.currentNode?.id).toBe('node_1');
    });

    it('should advance linear NPC nodes', () => {
        useDialogStore.getState().startDialog(TestDialog);
        useDialogStore.getState().advance(); // node_1 -> node_2

        expect(useDialogStore.getState().currentNode?.id).toBe('node_2');
    });

    it('should handle player choices', () => {
        useDialogStore.getState().startDialog(TestDialog);
        useDialogStore.getState().advance(); // to node_2
        useDialogStore.getState().advance(0); // Choose Option A

        expect(useDialogStore.getState().currentNode?.id).toBe('node_a');
    });

    it('should handle skill checks (success)', () => {
        useDialogStore.getState().startDialog(TestDialog);
        useDialogStore.getState().advance(); // to node_2
        useDialogStore.getState().advance(1); // Choose Option B (Skill)

        // Difficulty is 0, so it should succeed
        expect(useDialogStore.getState().currentNode?.id).toBe('node_success');
    });
});
