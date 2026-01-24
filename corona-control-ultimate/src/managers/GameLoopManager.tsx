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
    // Selectors & State
    const gameState = useGameStore((state) => state.gameState);
    const missions = useGameStore((state) => state.missions);
    const nextMission = useGameStore((state) => state.nextMission);
    const setGameOver = useGameStore((state) => state.setGameOver);
    const setVictory = useGameStore((state) => state.setVictory);
    const setTime = useGameStore((state) => state.setTime);
    const isPlaying = useGameStore((state) => state.gameState.isPlaying);

    // AI Controllers (Phase 9)
    const npcControllers = React.useRef<Map<number, BehaviorTreeNode>>(new Map());

    // Initialize AI & Systems
    useEffect(() => {
        // Init Krause AI
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

        // 1. Time & Events (Phase 10)
        TimeManager.getInstance().update(delta);
        EventManager.getInstance().update();

        // Sync Time with UI
        const tm = TimeManager.getInstance();
        const rawSeconds = tm.getSeconds();
        const displayTime = Math.floor(rawSeconds / 3600) * 100 + Math.floor((rawSeconds % 3600) / 60);

        // Update store occasionally to avoid React thrashing
        if (Math.abs(gameState.dayTime - displayTime) >= 1) {
            setTime(displayTime);
        }

        // 2. AI Logic (Phase 9)
        npcControllers.current.forEach((tree) => tree.execute());

        // 3. Quest Logic (Phase 11)
        AdvancedQuestManager.getInstance().update(delta);

        // 4. Mission Progression
        const currentMission = missions[gameState.currentMissionIndex];
        if (currentMission) {
            if (currentMission.type === 'DISPERSE_RIOTERS') {
                if (currentMission.currentAmount >= (currentMission.targetAmount || 1)) {
                    nextMission();
                }
            } else if (currentMission.type === 'SURVIVE') {
                useGameStore.getState().updateMissionProgress(delta);
                if (currentMission.currentAmount >= (currentMission.timeLimit || 60)) {
                    nextMission();
                }
            }
        } else {
            // Victory Condition
            if (!gameState.isVictory) {
                setVictory(true);
                AudioManager.getInstance().playMissionComplete();
            }
        }

        // 5. Tension & Crowd (Phase 6/7)
        TensionManager.getInstance().update(delta, performance.now());
        CrowdSystem.getInstance().update(delta);

        // 6. Game Over Condition
        if (gameState.health <= 0 && !gameState.isGameOver) {
            setGameOver(true);
        }
    });

    return null;
};

export default GameLoopManager;
