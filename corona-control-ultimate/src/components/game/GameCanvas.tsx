import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Sky, Stars, Html } from '@react-three/drei';
import { EffectComposer as ThreeEffectComposer } from '@react-three/postprocessing';
import { Bloom as PMBloom, ToneMapping as PMToneMapping, SMAA as PMSMAA, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';

// Components
import Player from '@/components/Player';
import LoadingScreen from '@/components/ui/LoadingScreen';
import StephansplatzGeometry from '@/components/StephansplatzGeometry';
import CrowdRenderer from '@/components/CrowdRenderer';
import CombatRenderer from '@/components/combat/CombatRenderer';
import GameSystem from '@/systems/GameSystem';
import WorldUI from '@/components/ui/WorldUI';

/**
 * AAA Post-Processing Pipeline
 * Gemäß AAA Grafik V4.0 Spezifikation Teil 10
 */
const PostProcessingPipeline: React.FC<{ quality: string }> = ({ quality }) => {
    const { gl } = useThree();

    useEffect(() => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.outputColorSpace = THREE.SRGBColorSpace;
    }, [gl]);

    if (quality === 'LOW') {
        return null;
    }

    return (
        <ThreeEffectComposer multisampling={quality === 'HIGH' ? 8 : 4}>
            <PMSMAA />
            <PMBloom
                luminanceThreshold={0.85}
                luminanceSmoothing={0.4}
                intensity={quality === 'HIGH' ? 0.5 : 0.3}
            />
            <PMToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <Vignette offset={0.3} darkness={quality === 'HIGH' ? 0.4 : 0.2} />
        </ThreeEffectComposer>
    );
};

const GameCanvas: React.FC = () => {
    const menuState = useGameStore(state => state.gameState.menuState);
    const settings = useGameStore(state => state.settings);
    const quality = settings.graphicsQuality;

    const shadowMapSize = quality === 'HIGH' ? 4096 : (quality === 'MEDIUM' ? 2048 : 1024);
    const dpr = quality === 'HIGH' ? [1, 2] : (quality === 'MEDIUM' ? [0.8, 1.5] : [0.5, 1]);
    const castShadows = true;

    return (
        <Canvas
            shadows={castShadows}
            dpr={dpr as any}
            gl={{
                powerPreference: 'high-performance',
                antialias: quality !== 'LOW',
                alpha: false,
                stencil: false,
            }}
        >
            {/* Himmel */}
            <Sky
                sunPosition={[100, 60, 50]}
                turbidity={8}
                rayleigh={0.5}
                mieCoefficient={0.005}
                mieDirectionalG={0.8}
            />

            {/* Sterne */}
            <Stars radius={300} depth={60} count={5000} factor={4} saturation={0.5} />

            {/* === AAA LIGHTING === */}
            <hemisphereLight args={[0xB4D4FF, 0x504030, 0.5]} />

            <directionalLight
                position={[80, 100, 60]}
                intensity={2.0}
                castShadow={castShadows}
                shadow-mapSize={[shadowMapSize, shadowMapSize]}
                shadow-camera-left={-100}
                shadow-camera-right={100}
                shadow-camera-top={100}
                shadow-camera-bottom={-100}
                shadow-camera-near={0.5}
                shadow-camera-far={300}
                shadow-bias={-0.0001}
                shadow-normalBias={0.02}
                color={0xFFFFF0}
            />

            <directionalLight
                position={[-50, 50, -50]}
                intensity={0.4}
                castShadow={false}
                color={0xFFFFFF}
            />

            <directionalLight
                position={[0, 30, -80]}
                intensity={0.3}
                castShadow={false}
                color={0xB0C4DE}
            />

            <ambientLight intensity={0.15} color={0xFFFFFF} />

            {/* === POST-PROCESSING === */}
            <PostProcessingPipeline quality={quality} />

            {/* === GAME CONTENT === */}
            <Suspense fallback={<Html><LoadingScreen /></Html>}>
                <Physics gravity={[0, -9.81, 0]} paused={menuState !== 'PLAYING'}>
                    <Player />
                    <CombatRenderer />
                    <CrowdRenderer />

                    {/* AAA Stephansplatz */}
                    <StephansplatzGeometry showGrid={false} showLandmarks={true} showEnvironment={true} />

                    {/* Ground Plane */}
                    <RigidBody type="fixed" position={[0, -0.5, 0]}>
                        <CuboidCollider args={[80, 0.5, 80]} />
                    </RigidBody>
                </Physics>

                <GameSystem />
                <WorldUI />
            </Suspense>
        </Canvas>
    );
};

export default GameCanvas;
