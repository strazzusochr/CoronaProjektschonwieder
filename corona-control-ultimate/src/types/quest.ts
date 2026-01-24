/**
 * Quest-Typen für Corona Control Ultimate
 * Basierend auf 02_MISSION_ULTRA.md
 */

export type QuestType = 'MAIN' | 'MAIN_BRANCH' | 'SIDE' | 'HIDDEN';

export interface QuestObjective {
    id: string;
    description: string;
    completed: boolean;
    progress?: number;
    target?: number;
}

export interface QuestReward {
    reputation?: number;
    bonus?: number;
    tensionModifier?: number;
    achievement?: string;
    intel?: boolean;
    storyBranch?: boolean;
}

export interface Quest {
    id: string;
    name: string;
    description: string;
    type: QuestType;
    status: 'LOCKED' | 'AVAILABLE' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
    triggerTime: number; // ms seit Spielstart
    timeLimit?: number; // optionales Zeitlimit in ms
    objectives: QuestObjective[];
    rewards: QuestReward;
    outcomes: string[];
}

export interface QuestState {
    activeQuests: string[];
    completedQuests: string[];
    failedQuests: string[];
    questProgress: Record<string, number>;
}
