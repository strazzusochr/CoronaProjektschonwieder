export type CurveType = 'LINEAR' | 'EXPONENTIAL' | 'LOGARITHMIC' | 'SIGMOID';

export class UtilityCurve {
    private type: CurveType;
    private slope: number;
    private exponent: number;

    constructor(type: CurveType, slope: number = 1, exponent: number = 1) {
        this.type = type;
        this.slope = slope;
        this.exponent = exponent;
    }

    public evaluate(input: number): number {
        // Input should be normalized 0..1
        const x = Math.max(0, Math.min(1, input));

        switch (this.type) {
            case 'LINEAR':
                return x * this.slope;
            case 'EXPONENTIAL':
                return Math.pow(x, this.exponent);
            case 'LOGARITHMIC':
                return Math.log(x * 9 + 1) / Math.log(10); // Simple log base 10 approx
            case 'SIGMOID':
                return 1 / (1 + Math.exp(-10 * (x - 0.5)));
            default:
                return x;
        }
    }
}

export interface Consideration {
    name: string;
    curve: UtilityCurve;
    getValue: () => number; // Returns 0..1
    weight: number;
}

export interface AIAction {
    name: string;
    weight: number;
    considerations: Consideration[];
    execute: () => void;
}

export class UtilityBrain {
    private actions: AIAction[] = [];

    public addAction(action: AIAction) {
        this.actions.push(action);
    }

    public decide(): AIAction | null {
        let bestAction: AIAction | null = null;
        let bestScore = -Infinity;

        for (const action of this.actions) {
            let score = action.weight;
            
            // Calculate score based on considerations
            // Modification Factor approach: Score * C1 * C2 ...
            // Or Weighted Sum: (C1*W1 + C2*W2) / TotalWeight
            
            // We use Modification Factor (Multiplicative) allows one factor to veto (0 score)
            // But we use an average for stability
            
            let totalConsiderationScore = 0;
            let totalWeight = 0;

            if (action.considerations.length === 0) {
                 totalConsiderationScore = 1; // Default if no considerations
            } else {
                 for (const cons of action.considerations) {
                     const val = cons.getValue();
                     const curveVal = cons.curve.evaluate(val);
                     totalConsiderationScore += curveVal * cons.weight;
                     totalWeight += cons.weight;
                 }
                 totalConsiderationScore /= Math.max(1, totalWeight);
            }

            const finalScore = score * totalConsiderationScore;

            if (finalScore > bestScore) {
                bestScore = finalScore;
                bestAction = action;
            }
        }

        return bestAction;
    }
}
