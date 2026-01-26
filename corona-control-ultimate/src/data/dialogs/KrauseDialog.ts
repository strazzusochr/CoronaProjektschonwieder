
import { DialogTree } from '@/types/DialogTypes';

export const KrauseDialog: DialogTree = {
    id: 'krause_confrontation',
    rootNodeId: 'start',
    nodes: {
        'start': {
            id: 'start',
            type: 'NPC',
            speakerId: 'Martin Krause',
            text: 'Ah, die Polizei. Was wollen Sie hier? Wir demonstrieren nur friedlich für unsere Rechte!',
            emotion: 'ANGRY',
            nextNodeId: 'choice_1'
        },
        'choice_1': {
            id: 'choice_1',
            type: 'PLAYER_CHOICE',
            choices: [
                {
                    text: 'Herr Krause, bitte beruhigen Sie die Menge. (Friedlich)',
                    nextNodeId: 'response_peaceful',
                    consequences: { setFlag: 'tried_peaceful' }
                },
                {
                    text: '[INTIMIDATION] Sie sind verhaftet! Kommen Sie mit! (Schwierigkeit: 5)',
                    nextNodeId: 'dummy', // Wird durch SkillCheck überschrieben
                    skillCheck: {
                        skillType: 'INTIMIDATION',
                        difficulty: 5,
                        successNodeId: 'krause_submits',
                        failureNodeId: 'krause_defiant'
                    }
                },
                {
                    text: '[DECEPTION] Wir haben Berichte über eine Bombe. Evakuieren Sie! (Schwierigkeit: 8)',
                    nextNodeId: 'dummy',
                    skillCheck: {
                        skillType: 'DECEPTION',
                        difficulty: 8,
                        successNodeId: 'krause_confused',
                        failureNodeId: 'krause_sees_through'
                    }
                }
            ]
        },
        'response_peaceful': {
            id: 'response_peaceful',
            type: 'NPC',
            speakerId: 'Martin Krause',
            text: 'Friedlich? Sie kommen mit Schlagstöcken und reden von Frieden? Lächerlich!',
            emotion: 'ANGRY',
            nextNodeId: 'end_fail'
        },
        'krause_submits': {
            id: 'krause_submits',
            type: 'NPC',
            speakerId: 'Martin Krause',
            text: 'Okay, okay! Keine Gewalt. Ich komme mit.',
            emotion: 'AFRAID',
            nextNodeId: 'end_arrest'
        },
        'krause_defiant': {
            id: 'krause_defiant',
            type: 'NPC',
            speakerId: 'Martin Krause',
            text: 'Sie machen mir keine Angst! Die Welt schaut zu!',
            emotion: 'ANGRY',
            nextNodeId: 'end_fail'
        },
        'krause_confused': {
            id: 'krause_confused',
            type: 'NPC',
            speakerId: 'Martin Krause',
            text: 'Eine Bombe? Hier? ...Verdammt. Leute, wir müssen hier weg!',
            emotion: 'SURPRISED',
            nextNodeId: 'end_evacuate'
        },
        'krause_sees_through': {
            id: 'krause_sees_through',
            type: 'NPC',
            speakerId: 'Martin Krause',
            text: 'Glauben Sie, ich bin dumm? Das ist ein billiger Trick!',
            emotion: 'ANGRY',
            nextNodeId: 'end_fail'
        },
        'end_arrest': {
            id: 'end_arrest',
            type: 'ACTION',
            actions: () => console.log('ACTION: ARREST KRAUSE'),
            nextNodeId: undefined // End
        },
        'end_evacuate': {
            id: 'end_evacuate',
            type: 'ACTION',
            actions: () => console.log('ACTION: EVACUATE CROWD'),
            nextNodeId: undefined // End
        },
        'end_fail': {
            id: 'end_fail',
            type: 'ACTION',
            actions: () => console.log('ACTION: DIALOG FAILED - RIOT STARTS'),
            nextNodeId: undefined // End
        }
    }
};
