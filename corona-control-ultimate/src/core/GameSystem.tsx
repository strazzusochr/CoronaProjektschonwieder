import React, { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import EngineLoop from '@/core/EngineLoop';
// Systems imports to ensure registration
import '@/systems/DayNightCycleSystem';
import '@/systems/NPCSpawnSystem';
import { useGameStore } from '@/stores/gameStore';

/**
 * GameSystem - Die Brücke zwischen React und der Core-Engine
 * Startet den EngineLoop und leitet useFrame-Updates weiter.
 */
const GameSystem: React.FC = () => {
    const isPlaying = useGameStore(state => state.gameState.isPlaying);
    const menuState = useGameStore(state => state.gameState.menuState);

    // Initialisierung
    useEffect(() => {
        console.log("🚀 V6.0 ENGINE SYSTEM STARTED");
        EngineLoop.start();

        return () => {
            EngineLoop.pause();
        };
    }, []);

    // Pausieren/Starten basierend auf MenuState
    useEffect(() => {
        if (menuState === 'PLAYING') {
            EngineLoop.start();
        } else {
            EngineLoop.pause();
        }
    }, [menuState]);

    // Haupt-Render-Loop Link
    useFrame((state, delta) => {
        if (!isPlaying && menuState !== 'PLAYING') return;

        // Leitet Delta an die V6.0 Engine weiter
        // EngineLoop kümmert sich um Fixed Timesteps (Physik 120Hz, KI 10Hz)
        EngineLoop.update(state.clock.elapsedTime, delta);
    });

    return null;
};

export default GameSystem;
