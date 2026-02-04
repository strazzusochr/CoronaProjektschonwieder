import React, { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useFrame } from '@react-three/fiber';
import AudioManager from './AudioManager';
import AdvancedQuestManager from '@/managers/QuestManager';
import CrowdSystem from '@/systems/CrowdSystem';
import TensionManager from '@/managers/TensionManager';
import { TreeFactory } from '@/ai/TreeFactory';
import { BehaviorTreeNode } from '@/ai/BehaviorTree';
import * as THREE from 'three';
import { TimeManager } from '@/managers/TimeManager';
import { EventManager } from '@/managers/EventManager';

const GameLoopManager: React.FC = () => {
    // Selektoren & Zustand
    const gameState = useGameStore((state) => state.gameState);
    const missions = useGameStore((state) => state.missions);
    const nextMission = useGameStore((state) => state.nextMission);
    const setGameOver = useGameStore((state) => state.setGameOver);
    const setVictory = useGameStore((state) => state.setVictory);
    const setTime = useGameStore((state) => state.setTime);
    const isPlaying = useGameStore((state) => state.gameState.isPlaying);

    // AI-Controller (Phase 9)
    const npcControllers = React.useRef<Map<number, BehaviorTreeNode>>(new Map());

    // Initialisierung von AI & Systemen
    useEffect(() => {
        // Initialisiere Krause AI
        const krauseId = 9999;
        const patrolPoints = [
            new THREE.Vector3(45, 0.5, -30),
            new THREE.Vector3(30, 0.5, -30),
            new THREE.Vector3(30, 0.5, -10)
        ];
        const tree = TreeFactory.createGuardPatrolTree(krauseId, patrolPoints);
        npcControllers.current.set(krauseId, tree);
    }, []);

    useFrame((_, delta) => {
        if (gameState.isGameOver || gameState.isVictory || !isPlaying) return;

        // Safety: Clamp delta to prevent "Spiral of Death" physics explosions
        const clampedDelta = Math.min(delta, 0.1);

        // 1. Zeit & Events (Phase 10)
        TimeManager.getInstance().update(clampedDelta);
        EventManager.getInstance().update();

        // Synchronisiere Zeit mit UI
        const tm = TimeManager.getInstance();
        const rawSeconds = tm.getSeconds();
        const displayTime = Math.floor(rawSeconds / 3600) * 100 + Math.floor((rawSeconds % 3600) / 60);

        // Store nur gelegentlich aktualisieren, um React-Thrashing zu vermeiden
        if (Math.abs(gameState.dayTime - displayTime) >= 1) {
            setTime(displayTime);
        }

        // 2. AI Logik (Phase 9)
        npcControllers.current.forEach((tree) => tree.execute());

        // 3. Quest Logik (Phase 11)
        AdvancedQuestManager.getInstance().update(clampedDelta);

        // 4. Missions-Fortschritt
        const currentMission = missions[gameState.currentMissionIndex];
        if (currentMission) {
            if (currentMission.type === 'DISPERSE_RIOTERS') {
                if (currentMission.currentAmount >= (currentMission.targetAmount || 1)) {
                    nextMission();
                }
            } else if (currentMission.type === 'SURVIVE') {
                useGameStore.getState().updateMissionProgress(clampedDelta);
                if (currentMission.currentAmount >= (currentMission.timeLimit || 60)) {
                    nextMission();
                }
            }
        } else {
            // Sieg-Bedingung
            if (!gameState.isVictory) {
                setVictory(true);
                AudioManager.getInstance().playMissionComplete();
            }
        }

        // 5. Spannung & Menschenmenge (Phase 6/7)
        TensionManager.getInstance().update(clampedDelta, performance.now());
        CrowdSystem.getInstance().update(clampedDelta);

        // 6. Game Over Bedingung
        if (gameState.health <= 0 && !gameState.isGameOver) {
            setGameOver(true);
        }
    });

    return null;
};

export default GameLoopManager;
