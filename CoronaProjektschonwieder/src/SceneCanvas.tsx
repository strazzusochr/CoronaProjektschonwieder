import { Environment, OrbitControls, Sky, Stars } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import type { AgentSnapshot, QualityPreset, SimulationSnapshot } from './game/sim';

type SceneCanvasProps = {
  snapshot: SimulationSnapshot;
  showGrid: boolean;
  showAtmosphere: boolean;
  showAgents: boolean;
  highContrast: boolean;
  quality: QualityPreset;
  selectedAgentId: number | null;
  onSelectAgent: (agentId: number) => void;
};

const PRESET_DPR: Record<QualityPreset, number | [number, number]> = {
  low: 1,
  medium: [1, 1.5],
  ultra: [1, 2],
};

function terrainColor(highContrast: boolean) {
  if (highContrast) {
    return {
      background: '#080808',
      fog: '#080808',
      floor: '#ffffff',
      wall: '#f0f0f0',
      ramp: '#99d4ff',
    };
  }
  return {
    background: '#081126',
    fog: '#081126',
    floor: '#28402f',
    wall: '#5e7b6f',
    ramp: '#79a9ff',
  };
}

function LemmingMesh({
  agent,
  selected,
  boardOffset,
  onSelect,
}: {
  agent: AgentSnapshot;
  selected: boolean;
  boardOffset: number;
  onSelect: (agentId: number) => void;
}) {
  const stateColor =
    agent.state === 'splatted'
      ? '#b14747'
      : agent.state === 'saved'
        ? '#66d497'
        : selected
          ? '#ffd24f'
          : '#8fb8ff';

  return (
    <group
      position={[agent.x - boardOffset, agent.y + 0.4, 0]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(agent.id);
      }}
    >
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[0.22, 0.42, 6, 12]} />
        <meshStandardMaterial color={stateColor} roughness={0.38} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.14, 14, 14]} />
        <meshStandardMaterial color="#f9f7f3" roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  );
}

function GameScene({
  snapshot,
  showGrid,
  showAtmosphere,
  showAgents,
  highContrast,
  selectedAgentId,
  onSelectAgent,
}: Omit<SceneCanvasProps, 'quality'>) {
  const colors = terrainColor(highContrast);
  const boardOffset = snapshot.width / 2;
  const solids = useMemo(() => snapshot.solids, [snapshot.solids]);

  return (
    <>
      <color attach="background" args={[colors.background]} />
      {showAtmosphere ? <fog attach="fog" args={[colors.fog, 20, 110]} /> : null}
      {showAtmosphere ? (
        <>
          <Sky distance={350000} sunPosition={[7, 2, 4]} turbidity={4.4} rayleigh={2.3} mieCoefficient={0.0048} mieDirectionalG={0.84} />
          <Stars radius={190} depth={90} count={7000} factor={4} saturation={0} fade speed={0.4} />
          <Environment preset="city" />
        </>
      ) : null}
      <ambientLight intensity={0.5} />
      <hemisphereLight intensity={0.95} color="#d3ebff" groundColor="#15231a" />
      <directionalLight
        castShadow
        intensity={2.8}
        position={[28, 40, 24]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.51, 0]} receiveShadow>
        <planeGeometry args={[snapshot.width + 14, 24]} />
        <meshStandardMaterial color={colors.floor} roughness={0.86} metalness={0.04} />
      </mesh>
      {solids.map((cell) => (
        <mesh key={`${cell.x}-${cell.y}`} position={[cell.x - boardOffset, cell.y - 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={cell.y <= 1 ? colors.floor : colors.wall} roughness={0.72} metalness={0.12} />
        </mesh>
      ))}
      <mesh position={[snapshot.exit.x - boardOffset, snapshot.exit.y + 0.2, 0]} castShadow receiveShadow>
        <torusGeometry args={[0.7, 0.17, 14, 40]} />
        <meshStandardMaterial color={colors.ramp} emissive={colors.ramp} emissiveIntensity={0.28} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[snapshot.spawn.x - boardOffset, snapshot.spawn.y + 0.35, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.42, 1.1, 12]} />
        <meshStandardMaterial color="#ffbf8f" roughness={0.58} metalness={0.24} />
      </mesh>
      {showAgents
        ? snapshot.agents.map((agent) => (
            <LemmingMesh
              key={agent.id}
              agent={agent}
              boardOffset={boardOffset}
              selected={agent.id === selectedAgentId}
              onSelect={onSelectAgent}
            />
          ))
        : null}
      {showGrid ? <gridHelper args={[snapshot.width + 2, snapshot.width + 2, '#7db5ff', '#2c2c2c']} position={[0, 0, -0.55]} /> : null}
    </>
  );
}

export default function SceneCanvas({
  snapshot,
  showGrid,
  showAtmosphere,
  showAgents,
  highContrast,
  quality,
  selectedAgentId,
  onSelectAgent,
}: SceneCanvasProps) {
  return (
    <div className="scene-canvas-shell">
      <Canvas
        className="scene-canvas"
        camera={{ position: [0, snapshot.height * 0.5, snapshot.width * 0.76], fov: 42 }}
        dpr={PRESET_DPR[quality]}
        shadows={quality !== 'low'}
        gl={{ antialias: true, alpha: false }}
      >
        <GameScene
          snapshot={snapshot}
          showGrid={showGrid}
          showAtmosphere={showAtmosphere}
          showAgents={showAgents}
          highContrast={highContrast}
          selectedAgentId={selectedAgentId}
          onSelectAgent={onSelectAgent}
        />
        <OrbitControls
          enablePan
          enableRotate
          enableZoom
          maxDistance={snapshot.width * 1.5}
          minDistance={18}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.9}
          target={[0, snapshot.height * 0.3, 0]}
        />
      </Canvas>
    </div>
  );
}
