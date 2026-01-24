import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Sky, Stars, Stats, Html } from '@react-three/drei';
import { useGameStore } from '@/stores/gameStore';

// Components
import Player from '@/components/Player';
import LoadingScreen from '@/components/ui/LoadingScreen';
import StephansplatzGeometry from '@/components/StephansplatzGeometry';
import HUD from '@/components/ui/HUD';
import Inventory from '@/components/ui/Inventory';
import SettingsMenu from '@/components/ui/SettingsMenu';
import DebugConsole from '@/components/ui/DebugConsole';
import CombatRenderer from '@/components/combat/CombatRenderer';
// Managers (Commented out for stability)
import '@/utils/VerificationSuite';
import GameSystem from '@/systems/GameSystem';

function App() {
    console.log('--- APP COMPONENT RENDERING (ENV RESTORED) ---');
    const debugMode = useGameStore(state => state.debugMode);

    return (
        <>
            <Canvas shadows camera={{ fov: 60 }} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
                <Suspense fallback={<Html fullscreen><LoadingScreen /></Html>}>
                    {/* Systems */}
                    <GameSystem />

                    {/* Environment & Lighting */}
                    <color attach="background" args={['#101015']} />
                    <fog attach="fog" args={['#101015', 10, 80]} />
                    <ambientLight intensity={0.35} />
                    <directionalLight position={[50, 50, 25]} intensity={0.8} castShadow />

                    <Sky sunPosition={[0, -1, 0]} />
                    <Stars />

                    {/* Geometry */}
                    <StephansplatzGeometry showGrid={true} showLandmarks={true} />

                    {/* Physics */}
                    <Physics gravity={[0, -9.81, 0]}>
                        <Player />
                        <CombatRenderer />
                        <RigidBody type="fixed" position={[0, -1, 0]}>
                            <CuboidCollider args={[50, 1, 50]} />
                            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                                <planeGeometry args={[100, 100]} />
                                <meshStandardMaterial color="#222" />
                            </mesh>
                        </RigidBody>
                    </Physics>
                </Suspense>
            </Canvas>
            <HUD />
            <Inventory />
            <SettingsMenu />
            <DebugConsole />
        </>
    );
}

export default App;
