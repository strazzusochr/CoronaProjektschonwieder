
export enum QuestType {
    MAIN = 'MAIN',
    SIDE = 'SIDE',
    TUTORIAL = 'TUTORIAL'
}

export enum QuestState {
    LOCKED = 'LOCKED',
    AVAILABLE = 'AVAILABLE',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

export enum ObjectiveType {
    KILL = 'KILL',
    COLLECT = 'COLLECT',
    TALK = 'TALK',
    GOTO = 'GOTO',
    PROTECT = 'PROTECT',
    WAIT = 'WAIT'
}

export interface QuestObjective {
    id: string;
    description: string;
    type: ObjectiveType;
    targetId?: string; // NPC_ID, Item_ID, etc.
    targetCount?: number;
    currentCount: number;
    isCompleted: boolean;
    isOptional?: boolean;
    hidden?: boolean;
}

export interface QuestReward {
    xp?: number;
    money?: number;
    items?: string[];
    reputation?: number;
    tensionModifier?: number;
    unlocksQuestId?: string;
}

export interface Quest {
    id: string;
    name: string;
    description: string;
    type: QuestType;
    state: QuestState;
    giverId?: string;
    objectives: QuestObjective[];
    rewards: QuestReward;
    timeLimit?: number; // Seconds
    timerStart?: number; // Timestamp
    prerequisites?: string[]; // IDs of required quests
    nextQuestId?: string; // Linear chain
}
