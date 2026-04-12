import { OrbitControls, Sky, Stars } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';

type Difficulty = 'rookie' | 'veteran' | 'nightmare';
type Theme = 'neon' | 'sunset';

type SceneCanvasProps = {
  paused: boolean;
  difficulty: Difficulty;
  wave: number;
  autoRotate: boolean;
  showGrid: boolean;
  showAtmosphere: boolean;
  theme: Theme;
};

type DroneProps = {
  index: number;
  wave: number;
  speedMultiplier: number;
  paused: boolean;
  color: string;
};

function difficultySpeed(difficulty: Difficulty) {
  if (difficulty === 'nightmare') {
    return 1.8;
  }

  if (difficulty === 'veteran') {
    return 1.3;
  }

  return 1;
}

function themeColors(theme: Theme) {
  if (theme === 'sunset') {
    return {
      background: '#1f0d0a',
      fog: '#24110f',
      floor: '#3a1f18',
      accentA: '#f59c69',
      accentB: '#f4d094',
    };
  }

  return {
    background: '#050816',
    fog: '#050816',
    floor: '#12152d',
    accentA: '#5f83ff',
    accentB: '#52d7ff',
  };
}

function ArenaFloor({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <cylinderGeometry args={[8.2, 8.2, 0.2, 48]} />
      <meshStandardMaterial color={color} roughness={0.84} metalness={0.06} />
    </mesh>
  );
}

function Drone({ index, wave, speedMultiplier, paused, color }: DroneProps) {
  const meshRef = useRef<Mesh>(null);
  const radius = 2.6 + (index % 4) * 0.9;
  const angleOffset = index * (Math.PI / 3.5);

  useFrame(({ clock }, delta) => {
    if (!meshRef.current || paused) {
      return;
    }

    const time = clock.getElapsedTime() * speedMultiplier;
    const dynamicRadius = radius + (wave - 1) * 0.18;
    meshRef.current.position.x = Math.cos(time + angleOffset) * dynamicRadius;
    meshRef.current.position.z = Math.sin(time + angleOffset) * dynamicRadius;
    meshRef.current.position.y = 1 + Math.sin(time * 2 + angleOffset) * 0.35;
    meshRef.current.rotation.x += delta * 1.3 * speedMultiplier;
    meshRef.current.rotation.y += delta * 0.9 * speedMultiplier;
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <icosahedronGeometry args={[0.34, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.32} roughness={0.44} metalness={0.38} />
    </mesh>
  );
}

function DroneSwarm({
  wave,
  difficulty,
  paused,
  accentA,
  accentB,
}: {
  wave: number;
  difficulty: Difficulty;
  paused: boolean;
  accentA: string;
  accentB: string;
}) {
  const count = Math.min(4 + wave, 12);
  const speedMultiplier = difficultySpeed(difficulty);
  const drones = [];

  for (let index = 0; index < count; index += 1) {
    drones.push(
      <Drone
        key={index}
        index={index}
        wave={wave}
        speedMultiplier={speedMultiplier}
        paused={paused}
        color={index % 2 === 0 ? accentA : accentB}
      />
    );
  }

  return <>{drones}</>;
}

function ArenaScene({
  paused,
  difficulty,
  wave,
  showGrid,
  showAtmosphere,
  theme,
}: Omit<SceneCanvasProps, 'autoRotate'>) {
  const colors = themeColors(theme);

  return (
    <>
      <color attach="background" args={[colors.background]} />
      {showAtmosphere ? <fog attach="fog" args={[colors.fog, 8, 28]} /> : null}
      {showAtmosphere ? (
        <>
          <Sky distance={450000} sunPosition={[4, 2, 6]} turbidity={5} rayleigh={2.1} mieCoefficient={0.005} mieDirectionalG={0.92} />
          <Stars radius={120} depth={50} count={4200} factor={3} saturation={0} fade speed={0.55} />
        </>
      ) : null}
      <ambientLight intensity={0.55} />
      <hemisphereLight intensity={1.1} color={colors.accentA} groundColor="#1a1412" />
      <directionalLight
        castShadow
        intensity={2.6}
        position={[8, 10, 6]}
        color={colors.accentB}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight intensity={20} angle={0.38} penumbra={0.45} position={[-7, 7, 6]} color={colors.accentA} />
      <ArenaFloor color={colors.floor} />
      <mesh position={[0, 0.6, 0]} receiveShadow castShadow>
        <torusGeometry args={[1.6, 0.25, 20, 70]} />
        <meshStandardMaterial color={colors.accentB} roughness={0.3} metalness={0.45} />
      </mesh>
      <DroneSwarm wave={wave} difficulty={difficulty} paused={paused} accentA={colors.accentA} accentB={colors.accentB} />
      {showGrid ? <gridHelper args={[20, 20, colors.accentA, '#2b2421']} position={[0, 0.01, 0]} /> : null}
    </>
  );
}

export default function SceneCanvas({
  paused,
  difficulty,
  wave,
  autoRotate,
  showGrid,
  showAtmosphere,
  theme,
}: SceneCanvasProps) {
  return (
    <div className="scene-canvas-shell">
      <Canvas className="scene-canvas" camera={{ position: [6.5, 4.8, 6.5], fov: 44 }} dpr={[1, 1.5]} shadows gl={{ antialias: true, alpha: false }}>
        <ArenaScene
          paused={paused}
          difficulty={difficulty}
          wave={wave}
          showGrid={showGrid}
          showAtmosphere={showAtmosphere}
          theme={theme}
        />
        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={16}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.05}
          autoRotate={autoRotate && !paused}
          autoRotateSpeed={difficultySpeed(difficulty)}
        />
      </Canvas>
    </div>
  );
}
