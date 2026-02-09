import { useEffect, lazy, Suspense } from 'react';
import { Stats } from '@react-three/drei';
import { useGameStore } from '@/stores/gameStore';

// Components
import GameCanvas from '@/components/game/GameCanvas';
import HUD from '@/components/ui/HUD';
import DialogUI from '@/components/ui/DialogUI';
import MainMenu from '@/components/ui/MainMenu';
import PauseMenu from '@/components/ui/PauseMenu';

// Lazy Loaded UI
const Inventory = lazy(() => import('@/components/ui/Inventory'));
const SettingsMenu = lazy(() => import('@/components/ui/SettingsMenu'));
const DebugConsole = lazy(() => import('@/components/ui/DebugConsole'));
const TutorialUI = lazy(() => import('@/components/ui/TutorialUI'));
const MultiplayerUI = lazy(() => import('@/components/ui/MultiplayerUI'));
const PerformanceUI = lazy(() => import('@/components/ui/PerformanceUI'));

import { initTutorialInputListener, useTutorialStore } from '@/managers/TutorialManager';
import '@/managers/ContextualHintsManager';
import '@/managers/NetworkManager';
import '@/managers/AntiCheatManager';
import '@/managers/PerformanceProfiler';

function App() {
    console.log('--- APP RENDERING ---');
    const menuState = useGameStore(state => state.gameState.menuState);

    // Global Key Listener for Pause
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                const currentMenuState = useGameStore.getState().gameState.menuState;
                if (currentMenuState === 'PLAYING') {
                    useGameStore.setState(state => ({
                        gameState: { ...state.gameState, menuState: 'PAUSED', isPlaying: false }
                    }));
                    document.exitPointerLock();
                } else if (currentMenuState === 'PAUSED') {
                    useGameStore.setState(state => ({
                        gameState: { ...state.gameState, menuState: 'PLAYING', isPlaying: true }
                    }));
                    document.body.requestPointerLock();
                }
            }
            // Quick Save/Load
            if (e.key === 'F5') {
                e.preventDefault();
                import('@/managers/SaveManager').then(m => {
                    m.saveManager.quickSave();
                    useGameStore.getState().setPrompt('💾 Schnellspeicherung...');
                    setTimeout(() => useGameStore.getState().setPrompt(null), 2000);
                });
            }
            if (e.key === 'F9') {
                e.preventDefault();
                import('@/managers/SaveManager').then(m => {
                    const success = m.saveManager.quickLoad();
                    useGameStore.getState().setPrompt(success ? '📂 Geladen!' : '❌ Kein Spielstand');
                    setTimeout(() => useGameStore.getState().setPrompt(null), 2000);
                });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Tutorial Input Listener
    useEffect(() => {
        const cleanup = initTutorialInputListener();
        return cleanup;
    }, []);

    // Auto-Start Tutorial on first game start + Auto-Save + Network
    useEffect(() => {
        if (menuState === 'PLAYING') {
            const tutorialCompleted = localStorage.getItem('tutorialCompleted');
            if (!tutorialCompleted) {
                setTimeout(() => {
                    useTutorialStore.getState().startTutorial();
                }, 1500);
            }
            import('@/managers/SaveManager').then(m => m.saveManager.startAutoSave());
            import('@/managers/NetworkManager').then(m => m.networkManager.connect());
        }
    }, [menuState]);

    const settings = useGameStore(state => state.settings);

    const getFilter = () => {
        switch (settings.colorblindMode) {
            case 'DEUTERANOPIA': return 'url(#deuteranopia)';
            case 'PROTANOPIA': return 'url(#protanopia)';
            case 'TRITANOPIA': return 'url(#tritanopia)';
            default: return 'none';
        }
    };

    return (
        <div style={{
            width: '100vw', height: '100vh',
            filter: getFilter(),
            fontSize: settings.largeTextEnabled ? '1.2rem' : '1rem'
        }}>
            {/* SVG Filter Definitions */}
            <svg style={{ display: 'none' }}>
                <defs>
                    <filter id="deuteranopia">
                        <feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0" />
                    </filter>
                    <filter id="protanopia">
                        <feColorMatrix type="matrix" values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0" />
                    </filter>
                    <filter id="tritanopia">
                        <feColorMatrix type="matrix" values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0" />
                    </filter>
                </defs>
            </svg>

            {menuState === 'MAIN' && <MainMenu />}
            {menuState === 'PAUSED' && <PauseMenu />}

            {/* 3D World */}
            <GameCanvas />

            {/* In-Game UI Overlays */}
            {menuState === 'PLAYING' && (
                <>
                    <HUD />
                    <Suspense fallback={null}>
                        <Inventory />
                    </Suspense>
                    <DialogUI />
                </>
            )}

            <Suspense fallback={null}>
                {menuState === 'SETTINGS' && <SettingsMenu />}
                <DebugConsole />
                <TutorialUI />
                <MultiplayerUI />
                <PerformanceUI />
            </Suspense>
            {/* Stats moved inside GameCanvas or disabled - causes issues outside Canvas */}
        </div>
    );
}

export default App;
