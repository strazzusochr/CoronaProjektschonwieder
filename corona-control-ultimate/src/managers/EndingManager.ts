import { useGameStore } from '@/stores/gameStore';

export type GameRank = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface GameResult {
    rank: GameRank;
    score: number;
    summary: string;
    objectivesCompleted: number;
    tensionLevel: number;
}

export class EndingManager {
    // Scoring Thresholds (basierend auf 02_MISSION_ULTRA)
    private static readonly RANK_S_THRESHOLD = 2500;
    private static readonly RANK_A_THRESHOLD = 2000;
    private static readonly RANK_B_THRESHOLD = 1500;
    private static readonly RANK_C_THRESHOLD = 1000;
    private static readonly RANK_D_THRESHOLD = 500;

    public static calculateEnding(): GameResult {
        const state = useGameStore.getState();
        const score = state.gameState.points; // Punkte
        const tension = state.tensionLevel;

        let rank: GameRank = 'F';

        if (state.gameState.health <= 0) {
            return {
                rank: 'F',
                score: score,
                summary: 'MISSION GESCHEITERT: Agent handlungsunfähig.',
                objectivesCompleted: 0, // Placeholder
                tensionLevel: tension
            };
        }

        if (score >= this.RANK_S_THRESHOLD) rank = 'S';
        else if (score >= this.RANK_A_THRESHOLD) rank = 'A';
        else if (score >= this.RANK_B_THRESHOLD) rank = 'B';
        else if (score >= this.RANK_C_THRESHOLD) rank = 'C';
        else if (score >= this.RANK_D_THRESHOLD) rank = 'D';

        let summary = '';
        switch (rank) {
            case 'S': summary = 'EXZELLENT: Die Situation wurde perfekt deeskaliert.'; break;
            case 'A': summary = 'SEHR GUT: Professionelle Arbeit, minimale Kollateralschäden.'; break;
            case 'B': summary = 'GUT: Mission erfüllt, aber Raum für Verbesserung.'; break;
            case 'C': summary = 'AKZEPTABEL: Ziele erreicht, aber hohe Spannungswerte.'; break;
            case 'D': summary = 'SCHWACH: Die Situation drohte zu entgleiten.'; break;
            case 'F': summary = 'VERSAGEN: Die öffentliche Ordnung ist zusammengebrochen.'; break;
        }

        return {
            rank,
            score,
            summary,
            objectivesCompleted: 0, // TODO: Count completed missions
            tensionLevel: tension
        };
    }
}
