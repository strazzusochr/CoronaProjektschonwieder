import { QuestState, QuestType, ObjectiveType } from '@/types/QuestData';
import type { Quest } from '@/types/QuestData';
import { useGameStore } from '@/stores/gameStore';

class AdvancedQuestManager {
    private static instance: AdvancedQuestManager;
    private quests: Map<string, Quest> = new Map();

    private constructor() {
        this.initializeQuests();
    }

    public static getInstance(): AdvancedQuestManager {
        if (!AdvancedQuestManager.instance) {
            AdvancedQuestManager.instance = new AdvancedQuestManager();
        }
        return AdvancedQuestManager.instance;
    }

    private initializeQuests() {
        // Definiere Quests (Phase 11 Daten)

        // Quest 1: Tutorial
        this.addQuest({
            id: 'Q_TUTORIAL_01',
            name: 'Grundausbildung',
            description: 'Melde dich beim Einsatzleiter und hole deine Ausrüstung.',
            type: QuestType.TUTORIAL,
            state: QuestState.AVAILABLE,
            giverId: 'NPC_COMMANDER',
            objectives: [
                { id: 'obj_talk_commander', description: 'Sprich mit dem Einsatzleiter', type: ObjectiveType.TALK, targetId: 'NPC_COMMANDER', currentCount: 0, targetCount: 1, isCompleted: false },
                { id: 'obj_equip_gear', description: 'Rüste den Schlagstock aus', type: ObjectiveType.COLLECT, targetId: 'ITEM_BATON', currentCount: 0, targetCount: 1, isCompleted: false }
            ],
            rewards: { xp: 100, reputation: 5 },
            nextQuestId: 'Q_MAIN_01'
        });

        // Quest 2: Main 01
        this.addQuest({
            id: 'Q_MAIN_01',
            name: 'Die erste Welle',
            description: 'Sichere den Stephansplatz vor den ersten Randalierern.',
            type: QuestType.MAIN,
            state: QuestState.LOCKED,
            prerequisites: ['Q_TUTORIAL_01'],
            objectives: [
                { id: 'obj_secure_area', description: 'Neutralisiere 5 Randalierer', type: ObjectiveType.KILL, currentCount: 0, targetCount: 5, isCompleted: false },
                { id: 'obj_protect_civ', description: 'Beschütze die Zivilisten', type: ObjectiveType.PROTECT, currentCount: 0, targetCount: 1, isCompleted: false }
            ],
            rewards: { xp: 500, money: 100, reputation: 20 }
        });
    }

    private addQuest(quest: Quest) {
        this.quests.set(quest.id, quest);
    }

    public update(dt: number) {
        // Prüfe Trigger & Timer
        this.quests.forEach(quest => {
            if (quest.state === QuestState.LOCKED) {
                // Prüfe Voraussetzungen
                if (quest.prerequisites) {
                    const allMet = quest.prerequisites.every(preId => {
                        const preQuest = this.quests.get(preId);
                        return preQuest && preQuest.state === QuestState.COMPLETED;
                    });
                    if (allMet) {
                        this.changeQuestState(quest.id, QuestState.AVAILABLE);
                    }
                }
            }

            if (quest.state === QuestState.ACTIVE && quest.timeLimit && quest.timerStart) {
                const elapsed = (Date.now() - quest.timerStart) / 1000;
                if (elapsed >= quest.timeLimit) {
                    this.failQuest(quest.id, "Zeit abgelaufen.");
                }
            }
        });
    }

    public startQuest(questId: string) {
        const quest = this.quests.get(questId);
        if (quest && quest.state === QuestState.AVAILABLE) {
            this.changeQuestState(questId, QuestState.ACTIVE);
            quest.timerStart = Date.now();
            useGameStore.getState().setPrompt(`QUEST GESTARTET: ${quest.name}`);
        }
    }

    public updateObjective(questId: string, objectiveId: string, amount: number = 1) {
        const quest = this.quests.get(questId);
        if (!quest || quest.state !== QuestState.ACTIVE) return;

        const obj = quest.objectives.find(o => o.id === objectiveId);
        if (obj && !obj.isCompleted) {
            obj.currentCount += amount;
            if (obj.targetCount && obj.currentCount >= obj.targetCount) {
                obj.isCompleted = true;
                this.checkQuestCompletion(quest);
            }
        }
    }

    private checkQuestCompletion(quest: Quest) {
        const allRequiredComplete = quest.objectives.every(o => o.isCompleted || o.isOptional);
        if (allRequiredComplete) {
            this.completeQuest(quest.id);
        }
    }

    private completeQuest(questId: string) {
        const quest = this.quests.get(questId);
        if (!quest) return;

        this.changeQuestState(questId, QuestState.COMPLETED);

        // Belohnungen
        if (quest.rewards.xp) useGameStore.getState().addPoints(quest.rewards.xp);
        // Mehr Belohnungslogik...

        useGameStore.getState().setPrompt(`QUEST ABGESCHLOSSEN: ${quest.name}`);

        // Nächste Quest auto-starten in Kette?
        if (quest.nextQuestId) {
            const nextQ = this.quests.get(quest.nextQuestId);
            if (nextQ && nextQ.state === QuestState.LOCKED) {
                // Wird beim nächsten Update verfügbar durch Voraussetzungen,
                // oder wir erzwingen es hier falls strikt linear
            }
        }
    }

    private failQuest(questId: string, reason: string) {
        const quest = this.quests.get(questId);
        if (!quest) return;

        this.changeQuestState(questId, QuestState.FAILED);
        useGameStore.getState().setPrompt(`QUEST GESCHEITERT: ${quest.name} (${reason})`);
    }

    private changeQuestState(questId: string, newState: QuestState) {
        const quest = this.quests.get(questId);
        if (quest) {
            quest.state = newState;
            // Notify UI
        }
    }

    // --- Öffentliche API für UI ---
    public getActiveQuests(): Quest[] {
        return Array.from(this.quests.values()).filter(q => q.state === QuestState.ACTIVE);
    }

    public getAvailableQuests(): Quest[] {
        return Array.from(this.quests.values()).filter(q => q.state === QuestState.AVAILABLE);
    }
}

// Export Helper Instanz Zugriff für UI
export const getActiveQuests = () => AdvancedQuestManager.getInstance().getActiveQuests();
export const getAvailableQuests = () => AdvancedQuestManager.getInstance().getAvailableQuests();

export default AdvancedQuestManager;
