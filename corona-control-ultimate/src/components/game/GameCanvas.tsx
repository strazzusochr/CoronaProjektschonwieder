import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import { EffectComposer as ThreeEffectComposer } from '@react-three/postprocessing';
import { Bloom as PMBloom, ToneMapping as PMToneMapping, SMAA as PMSMAA, Vignette, SSAO, BrightnessContrast, HueSaturation } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';

import Barricade from '@/components/environment/Barricade';
import WaterCannonVehicle from '@/components/vehicles/WaterCannonVehicle';
import CrowdRenderer from '@/components/CrowdRenderer';
import CombatRenderer from '@/components/combat/CombatRenderer';
import GameSystem from '@/core/GameSystem';

import WorldUI from '@/components/ui/WorldUI';
import Player from '@/components/Player';
import LoadingScreen from '@/components/ui/LoadingScreen';
// V6.0 Systems
import DynamicLighting, { DynamicSky } from '@/rendering/DynamicLighting';
import WorldStreamingRenderer from '@/world/WorldStreamingRenderer';
import StephansplatzGeometry from '@/components/StephansplatzGeometry';

/**
 * AAA Post-Processing Pipeline
 * Gemäß AAA Grafik V4.0 Spezifikation Teil 10
 */
const PostProcessingPipeline: React.FC<{ quality: string }> = ({ quality }) => {
    const { gl } = useThree();

    useEffect(() => {
        gl.toneMapping = THREE.NoToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.outputColorSpace = THREE.SRGBColorSpace;
    }, [gl]);

    if (quality === 'LOW') {
        return null;
    }

    return (
        <ThreeEffectComposer multisampling={quality === 'HIGH' ? 8 : 4}>
            <PMSMAA />

            {/* SSAO for depth (Only HIGH/MEDIUM) */}
            {(quality === 'HIGH' || quality === 'MEDIUM') && (
                <SSAO
                    intensity={20}
                    radius={0.3}
                    luminanceInfluence={0.5}
                />
            )}

            <PMBloom
                luminanceThreshold={0.85}
                luminanceSmoothing={0.4}
                intensity={quality === 'HIGH' ? 0.5 : 0.3}
            />

            {/* Color Grading */}
            <BrightnessContrast
                brightness={-0.05}
                contrast={0.15}
            />
            <HueSaturation
                hue={0}
                saturation={0.15}
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
                stencil: true,
            }}
        >
            {/* V6.0 Dynamic Sky & Lighting */}
            <DynamicSky />
            <DynamicLighting quality={quality} castShadows={castShadows} />

            {/* === POST-PROCESSING === */}

            {/* === POST-PROCESSING === */}
            <PostProcessingPipeline quality={quality} />

            {/* === GAME CONTENT === */}
            <Suspense fallback={<Html><LoadingScreen /></Html>}>
                <Physics
                    gravity={[0, -9.81, 0]}
                    paused={menuState !== 'PLAYING'}
                    timeStep={1 / 120}
                >
                    <Player />
                    <CombatRenderer />
                    <CrowdRenderer />

                    {/* AAA Stephansplatz (Zentrum) */}
                    <StephansplatzGeometry showGrid={false} showLandmarks={true} showEnvironment={true} />

                    {/* V6.0 Chaos Elements (Barrikaden) */}
                    <Barricade position={[5, 0.5, 5]} type="WOOD_BARRIER" rotation={[0, 0.5, 0]} />
                    <Barricade position={[-5, 0.5, 8]} type="MOLOTOV_PILE" rotation={[0, -0.2, 0]} />
                    <Barricade position={[0, 0.5, 15]} type="BURNING_TIRE" />

                    {/* PHASE 5: WATER CANNON TEST */}
                    <WaterCannonVehicle position={[-10, 0.5, 20]} rotation={[0, Math.PI, 0]} />

                    {/* V6.0 World Streaming (Umland) */}
                    <WorldStreamingRenderer />

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
