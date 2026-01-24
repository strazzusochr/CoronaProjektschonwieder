import React from 'react';
import { useGameStore } from '@/stores/gameStore';
import NPC from '@/components/NPC';

const CrowdManager: React.FC = () => {
    const npcs = useGameStore(state => state.npcs);
    const playerPos = useGameStore(state => state.player.position);

    // LOD Settings
    const LOD_DIST_PHYSICS = 50; // Nur NPCs innerhalb 50m haben Physik/Logic

    // Performance: Wir filtern die Liste jeden Frame oder (besser) wir verlassen uns auf React's Diffing
    // Da sich playerPos oft ändert, führt das zu Re-Renders. 
    // Aber bei 500 NPCs ist das mounten/unmounten teuer.
    // Optimierung: Wir nutzen useMemo mit einer groben Rasterung oder akzeptieren den Re-Render für jetzt.
    // Für "Ultimate" Standard: Filtern im Render-Loop.

    const visibleNPCs = npcs.filter(npc => {
        const dx = playerPos[0] - npc.position[0];
        const dz = playerPos[2] - npc.position[2];
        const distSq = dx * dx + dz * dz;
        return distSq < LOD_DIST_PHYSICS * LOD_DIST_PHYSICS;
    });

    return (
        <group>
            {visibleNPCs.map((npc) => (
                <NPC key={npc.id} id={npc.id} type={npc.type} position={npc.position} state={npc.state} />
            ))}
        </group>
    );
};

export default CrowdManager;
