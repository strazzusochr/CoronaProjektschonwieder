import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/gameStore';

export interface MissionEvent {
    id: string;
    time: number; // in milliseconds relative to mission start
    executed: boolean;
    action: () => void;
    description: string;
}

const MissionManager: React.FC = () => {
    const gameState = useGameStore(state => state.gameState);
    const activeCutscene = useGameStore(state => state.gameState.activeCutscene);
    const updateMissionProgress = useGameStore(state => state.updateMissionProgress);
    const setPlayerPosition = useGameStore(state => state.setPlayerPosition);
    
    const missionStartTime = useRef<number>(Date.now());
    const eventQueue = useRef<MissionEvent[]>([]);
    const lastCutscene = useRef<string | null>(null);

    // Initialisierung der Missions-Events
    useEffect(() => {
        if (gameState.currentMissionIndex === 0 && gameState.isPlaying) {
            setupMissionEvents();
        }
    }, [gameState.currentMissionIndex, gameState.isPlaying]);

    // Teleportation nach dem Briefing
    useEffect(() => {
        if (lastCutscene.current === 'CS_STAATSFEIND_01_BRIEFING' && activeCutscene === null) {
            console.log("Teleporting Player to Stephansplatz North (T+0ms)");
            setPlayerPosition([42.5, 0.2, -15.8]);
            missionStartTime.current = Date.now(); // Neustart der Missionszeit für Phase 1
        }
        lastCutscene.current = activeCutscene;
    }, [activeCutscene, setPlayerPosition]);

    const setupMissionEvents = () => {
        eventQueue.current = [
            {
                id: 'TUTORIAL_MOVE',
                time: 5000,
                executed: false,
                description: 'Tutorial Prompt: WASD',
                action: () => {
                    useGameStore.getState().setPrompt("BEWEGUNG: Verwende WASD zum Gehen. Halte SHIFT zum Sprinten.");
                    setTimeout(() => useGameStore.getState().setPrompt(null), 8000);
                    // Spawn Wave 1 Ambient NPCs (50 Touristen/Einheimische)
                    useGameStore.getState().spawnWave(50, 'TOURIST');
                }
            },
            {
                id: 'WAYPOINT_REACHED_CHECK',
                time: 30000,
                executed: false,
                description: 'Prüfe ob Beobachtungsposten erreicht wurde',
                action: () => {
                   // Automatische Vervollständigung für Tutorial-Zwecke oder Check-Logik
                }
            },
            {
                id: 'TUTORIAL_BINOCS',
                time: 44700, 
                executed: false,
                description: 'Tutorial Prompt: Fernglas',
                action: () => {
                    useGameStore.getState().setPrompt("FERNGLAS: Drücke B um das Fernglas zu aktivieren. Beobachte die Umgebung.");
                    setTimeout(() => useGameStore.getState().setPrompt(null), 10000);
                }
            },
            {
                id: 'KRAUSE_APPROACH',
                time: 240000, 
                executed: false,
                description: 'Krause Van nähert sich',
                action: () => {
                   useGameStore.getState().setPrompt("⚠️ FUNK (KOVACS): Weißer Transporter am Platz gesichtet. Kennzeichen W-12345. Markieren!");
                   setTimeout(() => useGameStore.getState().setPrompt(null), 10000);
                }
            },
            {
                id: 'KRAUSE_SPEECH',
                time: 300000,
                executed: false,
                description: 'Krause beginnt seine Rede',
                action: () => {
                   useGameStore.getState().setPrompt("⚠️ ALERT: Martin Krause hält eine unangemeldete Rede vom Van-Dach!");
                   // Krause auf den Van teleportieren
                   useGameStore.getState().updateNpc(9999, { position: [45.0, 1.8, -35.0], type: 'KRAUSE' });
                   
                   setTimeout(() => {
                       useGameStore.getState().setPrompt("⚠️ FUNK (KOVACS): Die Menge wird unruhig! Deeskalieren Sie, bevor Blut fließt!");
                       setTimeout(() => useGameStore.getState().setPrompt(null), 8000);
                   }, 10000);

                   useGameStore.getState().spawnWave(60, 'RIOTER'); // Stimmung kippt massiv
                }
            }
        ];
    };

    useFrame((_state, _delta) => {
        if (!gameState.isPlaying || activeCutscene) return;

        const elapsedTime = Date.now() - missionStartTime.current;

        eventQueue.current.forEach(event => {
            if (!event.executed && elapsedTime >= event.time) {
                event.executed = true;
                console.log(`Mission Event: ${event.description}`);
                event.action();
                updateMissionProgress(0); 
            }
        });
    });

    return null;
};

export default MissionManager;
