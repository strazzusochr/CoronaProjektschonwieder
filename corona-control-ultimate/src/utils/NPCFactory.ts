/**
 * NPCFactory - Deterministic attribute generation for V6.0 NPCs
 */

export interface NPCAttributes {
    id: number;
    type: string;
    faction: 'CIVILIAN' | 'POLICE' | 'RIOTER' | 'KRAUSE' | 'JOURNALIST';
    visuals: {
        clothingColor: [number, number, number];
        skinTone: 'light' | 'medium' | 'dark';
        height: number;
        hairColor: number;
    };
    behavior: {
        aggression: number;
        relationshipScore: number;
        speed: number;
    };
}

class NPCFactory {
    private static instance: NPCFactory;

    // Type Definitions for V6.0 Variety
    private PROTESTER_SUBTYPES = [
        'BLACK_BLOCK', 'PEACEFUL_WALKER', 'STUDENT_REBEL', 'CONSPIRACY_THEORIST',
        'ANGRY_RETIREE', 'HIPPIE_IDEALIST', 'MASK_REFUSER', 'YOUTRE_ACTIVIST',
        'LABOUR_UNIONIST', 'ARTIST_PROTESTER', 'TECH_REJECTOR', 'GREEN_WARRIOR',
        'FREEDOM_FIGHTER', 'CHAOS_AGENT', 'PUNK_ROCKER', 'MODERATE_CRITIC',
        'RELIGIOUS_SKEPTIC', 'LOCAL_SHOP_OWNER', 'UNEMPLOYED_ANGRY', 'PARENT_CONCERNED',
        'PROFESSOR_CRITIC', 'HACKER_ACTIVIST', 'SKATER_PUNK', 'OUTCAST',
        'OCCUPY_VETERAN', 'SOCIAL_JUSTICE_WARRIOR', 'ANARCHIST', 'NATIONALIST',
        'VAGABOND', 'STREET_PERFORMER', 'SPECTATOR_INVOLVED'
    ]; // 31 types

    private POLICE_SUBTYPES = [
        'PATROL_OFFICER', 'WEGA_STRIKE_FORCE', 'RIOT_SQUAD', 'DETECTIVE_PLAINCLOTHES',
        'POLICE_COMMANDER', 'LOGISTICS_UNIT', 'CROWD_CONTROL_SPECIALIST',
        'MEDIC_POLICE', 'CANINE_HANDLER', 'SURVEILLANCE_OFFICER'
    ]; // 10 types

    private constructor() { }

    public static getInstance(): NPCFactory {
        if (!NPCFactory.instance) {
            NPCFactory.instance = new NPCFactory();
        }
        return NPCFactory.instance;
    }

    private seededRandom(seed: number): number {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    public generateAttributes(id: number, type: string): NPCAttributes {
        const seed = id * 1.5;
        const rand = (s: number) => this.seededRandom(seed + s);

        let faction: NPCAttributes['faction'] = 'CIVILIAN';
        let subType = type;

        // Auto-assign sub-types if generic type is provided
        if (type === 'RIOTER' || type === 'PROTESTER') {
            faction = 'RIOTER';
            subType = this.PROTESTER_SUBTYPES[Math.floor(rand(10) * this.PROTESTER_SUBTYPES.length)];
        } else if (type === 'POLICE' || type === 'WEGA') {
            faction = 'POLICE';
            subType = this.POLICE_SUBTYPES[Math.floor(rand(11) * this.POLICE_SUBTYPES.length)];
        } else if (type === 'KRAUSE') {
            faction = 'KRAUSE';
        } else if (type === 'JOURNALIST') {
            faction = 'JOURNALIST';
        }

        // Skin Tone & Hair
        const skinTones: Array<'light' | 'medium' | 'dark'> = ['light', 'medium', 'dark'];
        const skinTone = skinTones[Math.floor(rand(1) * 3)];
        const hairColors = [0x8B6914, 0x3D2314, 0x1A1A1A, 0x5E4B3C, 0xA0522D, 0xD4AF37, 0x4B3621];
        const hairColor = hairColors[Math.floor(rand(2) * hairColors.length)];

        // Visual Layout based on sub-type
        let clothingColor: [number, number, number] = [100, 100, 100];
        let aggression = 0;
        let speed = 2.0;
        let relScore = 0;

        if (faction === 'POLICE') {
            relScore = 60;
            aggression = 0.2;
            if (subType === 'WEGA_STRIKE_FORCE') {
                clothingColor = [20, 20, 30]; // Dark Navy
                aggression = 0.8;
                speed = 3.5;
            } else if (subType === 'RIOT_SQUAD') {
                clothingColor = [40, 40, 50];
                aggression = 0.5;
                speed = 2.5;
            } else {
                clothingColor = [0, 34, 102];
            }
        } else if (faction === 'RIOTER') {
            aggression = 0.6;
            if (subType === 'BLACK_BLOCK') {
                clothingColor = [5, 5, 5]; // Deep Black
                aggression = 1.0;
                speed = 4.0;
                relScore = -80;
            } else if (subType === 'HIPPIE_IDEALIST') {
                clothingColor = [180, 100, 200]; // Purple/Bunt
                aggression = 0.1;
                speed = 1.8;
                relScore = 20;
            } else if (subType === 'ANGRY_RETIREE') {
                clothingColor = [120, 110, 100];
                aggression = 0.4;
                speed = 1.5;
                relScore = -10;
            } else {
                clothingColor = rand(3) > 0.5 ? [40, 40, 40] : [150, 0, 0];
                aggression = 0.5 + rand(8) * 0.4;
                speed = 2.5 + rand(9) * 1.5;
                relScore = -20 - rand(12) * 40;
            }
        } else if (faction === 'KRAUSE') {
            clothingColor = [40, 45, 60];
            aggression = 0;
            relScore = 100;
        } else {
            // Random Civilian
            clothingColor = [
                Math.floor(rand(4) * 150 + 50),
                Math.floor(rand(5) * 150 + 50),
                Math.floor(rand(6) * 150 + 50)
            ];
            relScore = 0;
        }

        return {
            id,
            type: subType,
            faction,
            visuals: {
                clothingColor,
                skinTone,
                height: 0.9 + rand(7) * 0.2, // 0.9 - 1.1 scale
                hairColor
            },
            behavior: {
                aggression,
                relationshipScore: relScore,
                speed
            }
        };
    }
}

export default NPCFactory.getInstance();
