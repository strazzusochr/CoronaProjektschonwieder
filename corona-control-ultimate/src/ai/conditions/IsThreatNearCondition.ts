import { ConditionalNode, Blackboard } from '../BehaviorTree';
import * as THREE from 'three';

export const createIsThreatNearCondition = (distance: number) => {
    return new ConditionalNode(null as any, (bb: Blackboard) => { // Hack: passed blackboard in exec, conditional node ctor might need refactor or this is fine
        const threats = bb.get('nearbyThreats') as THREE.Vector3[];
        const pos = bb.get('position') as THREE.Vector3;

        if (!threats || threats.length === 0) return false;

        for (const threat of threats) {
            if (pos.distanceTo(threat) < distance) return true;
        }
        return false;
    });
};

// Also define class version if preferred
export class IsThreatNearCondition extends ConditionalNode {
    constructor(blackboard: Blackboard, private distance: number) {
        super(blackboard, (bb) => {
            const threats = bb.get('nearbyThreats') as any[]; // Array of threat objects or positions
            const pos = bb.get('position') as THREE.Vector3;

            if (!threats || threats.length === 0) return false;

            // Assuming threat objects have a position
            return threats.some(t => {
                const tPos = t.position || t;
                return pos.distanceTo(tPos) < this.distance;
            });
        });
    }
}
