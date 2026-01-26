
export type DialogEmotion = 'NEUTRAL' | 'HAPPY' | 'ANGRY' | 'SAD' | 'SURPRISED' | 'AFRAID';

export interface SkillCheck {
    skillType: string; // z.B. 'INTIMIDATION', 'DECEPTION'
    difficulty: number; // 1-10
    successNodeId: string;
    failureNodeId: string;
}

export interface DialogChoice {
    text: string;
    nextNodeId: string;
    requirements?: {
        skill?: string;
        minLevel?: number;
        flag?: string;
    };
    skillCheck?: SkillCheck;
    consequences?: {
        setFlag?: string;
        reputationChange?: { faction: string, amount: number };
    };
}

export interface DialogNode {
    id: string;
    type: 'NPC' | 'PLAYER_CHOICE' | 'ACTION';
    speakerId?: string; // Nur für NPC Nodes
    text?: string; // Nur für NPC Nodes
    emotion?: DialogEmotion;
    voiceover?: string;
    animation?: string;

    // Für NPC Nodes (linear)
    nextNodeId?: string;

    // Für Player Choice Nodes
    choices?: DialogChoice[];

    // Für Action Nodes
    actions?: () => void;
}

export interface DialogTree {
    id: string;
    rootNodeId: string;
    nodes: Record<string, DialogNode>;
}
