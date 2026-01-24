import { useGameStore } from '@/stores/gameStore';

export interface DialogOption {
    text: string;
    nextNodeId?: string; // If null, end dialog
    action?: () => void; // Side effects (give item, start quest)
    condition?: () => boolean; // If false, option hidden/disabled
}

export interface DialogNode {
    id: string;
    speakerName: string;
    text: string;
    options: DialogOption[];
    entryAction?: () => void;
}

class DialogSystem {
    private static instance: DialogSystem;
    private dialogs: Map<string, DialogNode> = new Map();
    private activeNodeId: string | null = null;

    private constructor() {
        this.initializeDialogs();
    }

    public static getInstance(): DialogSystem {
        if (!DialogSystem.instance) {
            DialogSystem.instance = new DialogSystem();
        }
        return DialogSystem.instance;
    }

    private initializeDialogs() {
        // --- NPC: COMMANDER (Tutorial) ---
        this.addDialog({
            id: 'CMD_INTRO',
            speakerName: 'Einsatzleiter Weber',
            text: 'Ah, da sind Sie ja. Die Lage am Stephansplatz spitzt sich zu. Wir brauchen jeden Mann.',
            options: [
                {
                    text: 'Was ist die Situation?',
                    nextNodeId: 'CMD_SITUATION'
                },
                {
                    text: 'Ich bin bereit.',
                    nextNodeId: 'CMD_READY',
                    action: () => {
                        // Start Tutorial Quest logic if needed
                    }
                }
            ]
        });

        this.addDialog({
            id: 'CMD_SITUATION',
            speakerName: 'Einsatzleiter Weber',
            text: 'Eine Gruppe "Freiheitskämpfer" versammelt sich. Martin Krause hetzt sie auf. Wir müssen Präsenz zeigen, aber keine Eskalation provozieren.',
            options: [
                { text: 'Verstanden.', nextNodeId: 'CMD_READY' }
            ]
        });

        this.addDialog({
            id: 'CMD_READY',
            speakerName: 'Einsatzleiter Weber',
            text: 'Gut. Holen Sie sich Ihren Schlagstock aus dem Spind und melden Sie sich dann auf Posten.',
            options: [
                {
                    text: '[Beenden] Bin unterwegs.',
                    action: () => {
                        // Trigger Quest Objective Complete
                        // AdvancedQuestManager.getInstance().updateObjective('Q_TUTORIAL_01', 'obj_talk_commander');
                        // Use a global/bus or assume access (Importing QuestManager here might cause cycle, beware)
                        // For now, prompt
                        useGameStore.getState().setPrompt("QUEST UPDATE: Sprich mit Commander erledigt.");
                    }
                }
            ]
        });
    }

    private addDialog(node: DialogNode) {
        this.dialogs.set(node.id, node);
    }

    public startDialog(nodeId: string) {
        const node = this.dialogs.get(nodeId);
        if (node) {
            this.activeNodeId = nodeId;
            this.updateUI(node);
            if (node.entryAction) node.entryAction();
        }
    }

    public selectOption(optionIndex: number) {
        if (!this.activeNodeId) return;
        const node = this.dialogs.get(this.activeNodeId);
        if (!node) return;

        const option = node.options[optionIndex];
        if (option) {
            if (option.action) option.action();

            if (option.nextNodeId) {
                this.startDialog(option.nextNodeId);
            } else {
                this.endDialog();
            }
        }
    }

    public endDialog() {
        this.activeNodeId = null;
        useGameStore.getState().setPrompt(null); // Clear UI
        // In real UI, we would set isDialogOpen = false in store
    }

    private updateUI(node: DialogNode) {
        // Mocking UI by using Prompt/Console for now
        // In Phase 16 (UI), this will link to the real Dialog Component
        let message = `[${node.speakerName}]: ${node.text}\n`;
        node.options.forEach((opt, i) => {
            message += `[${i + 1}] ${opt.text}   `;
        });
        useGameStore.getState().setPrompt(message); // Temporary display
    }
}

export default DialogSystem;
