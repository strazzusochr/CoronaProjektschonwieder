import { Canvas } from '@react-three/fiber';
import { Float, OrbitControls, Sky, Stars } from '@react-three/drei';

function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[48, 48]} />
      <meshStandardMaterial color="#261914" roughness={0.96} metalness={0.04} />
    </mesh>
  );
}

function CathedralPlaceholder() {
  return (
    <Float speed={1.6} rotationIntensity={0.12} floatIntensity={0.28}>
      <group position={[0, 1.8, 0]}>
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[3.4, 2.2, 1.8]} />
          <meshStandardMaterial color="#c98149" roughness={0.56} metalness={0.1} />
        </mesh>

        <mesh castShadow receiveShadow position={[0, 2.1, 0]}>
          <boxGeometry args={[1.4, 2.4, 1.15]} />
          <meshStandardMaterial color="#e1b479" roughness={0.46} metalness={0.08} />
        </mesh>

        <mesh castShadow receiveShadow position={[-1.1, 2.25, 0]}>
          <cylinderGeometry args={[0.34, 0.48, 3.1, 6]} />
          <meshStandardMaterial color="#93613d" roughness={0.54} metalness={0.12} />
        </mesh>

        <mesh castShadow receiveShadow position={[1.1, 2.25, 0]}>
          <cylinderGeometry args={[0.34, 0.48, 3.1, 6]} />
          <meshStandardMaterial color="#93613d" roughness={0.54} metalness={0.12} />
        </mesh>

        <mesh castShadow position={[0, 4.2, 0]}>
          <coneGeometry args={[0.5, 1.7, 6]} />
          <meshStandardMaterial color="#f3d3a4" roughness={0.38} metalness={0.12} />
        </mesh>
      </group>
    </Float>
  );
}

function CityEnvironment() {
  return (
    <>
      <color attach="background" args={['#050816']} />
      <fog attach="fog" args={['#050816', 10, 34]} />
      <Sky
        distance={450000}
        sunPosition={[5, 2, 6]}
        turbidity={6}
        rayleigh={2.9}
        mieCoefficient={0.006}
        mieDirectionalG={0.9}
      />
      <Stars radius={120} depth={60} count={5000} factor={3.4} saturation={0} fade speed={0.7} />
      <ambientLight intensity={0.55} color="#f4d6b1" />
      <hemisphereLight intensity={1.05} color="#9eb6ff" groundColor="#22130f" />
      <directionalLight
        castShadow
        color="#ffd7ae"
        intensity={3.1}
        position={[7, 11, 5]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight color="#ffb974" intensity={24} angle={0.34} penumbra={0.5} position={[-6, 8, 6]} />
      <GroundPlane />
      <CathedralPlaceholder />
      <gridHelper args={[28, 28, '#725646', '#37271e']} position={[0, 0.01, 0]} />
    </>
  );
}

export default function SceneCanvas() {
  return (
    <div className="scene-canvas-shell">
      <Canvas
        className="scene-canvas"
        camera={{ position: [7.5, 5.5, 7.5], fov: 42 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ antialias: true, alpha: false }}
      >
        <CityEnvironment />
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={16}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
    </div>
  );
}
