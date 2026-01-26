import React, { useRef } from 'react';
import { Html } from '@react-three/drei';
import { useGameStore } from '@/stores/gameStore';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const WorldUI: React.FC = () => {
    const missions = useGameStore(state => state.missions);
    const currentMissionIndex = useGameStore(state => state.gameState.currentMissionIndex);
    const currentMission = missions[currentMissionIndex];
    const npcs = useGameStore(state => state.npcs);
    const playerPos = useGameStore(state => state.player.position);

    // Filter active objectives that have a location
    // Since our mission structure is simple, we might need to infer locations or add them to mission data.
    // For now, let's assume we want to mark specific NPCs or locations.

    // Example: Mark "Krause" if mission is active
    const krauseId = 'npc_krause'; // ID from mission logic
    const krauseNPC = npcs.find(n => n.id === krauseId);

    return (
        <>
            {/* Mission Target Marker */}
            {currentMission && currentMission.id === 'mission_02' && krauseNPC && (
                <Html position={[krauseNPC.position[0], krauseNPC.position[1] + 2.5, krauseNPC.position[2]]} center>
                    <div style={{
                        color: 'gold',
                        fontWeight: 'bold',
                        textShadow: '0 0 5px black',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <div style={{ fontSize: '24px' }}>▼</div>
                        <div style={{ background: 'rgba(0,0,0,0.5)', padding: '2px 5px', borderRadius: '4px' }}>
                            ZIEL
                        </div>
                    </div>
                </Html>
            )}

            {/* Interaction Prompts (Example: Near specific objects) */}
            {/* We can iterate over interactive objects here if we had a list */}
        </>
    );
};

export default WorldUI;
