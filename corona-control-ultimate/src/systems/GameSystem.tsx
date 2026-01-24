import React from 'react';
import { useFrame } from '@react-three/fiber';
import TimeSystem from './TimeSystem';
import TensionSystem from './TensionSystem';
import MissionSystem from './MissionSystem';
import CombatSystem from './CombatSystem';
import AISystem from './AISystem';

const GameSystem: React.FC = () => {
    useFrame((state, delta) => {
        // Kern-System Update-Loop
        TimeSystem.update(delta);
        TensionSystem.update(delta);
        MissionSystem.update(delta);
        CombatSystem.update(delta);
        AISystem.update(delta);
    });

    return null; // Nur Logik, kein Rendering
};

export default GameSystem;
