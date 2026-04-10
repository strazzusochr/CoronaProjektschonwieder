import { Canvas } from '@react-three/fiber';
import { Float, OrbitControls, Sky, Stars } from '@react-three/drei';

function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[48, 48]} />
      <meshStandardMaterial color="#21140f" roughness={0.92} metalness={0.08} />
    </mesh>
  );
}

function CathedralPlaceholder() {
  return (
    <Float speed={1.6} rotationIntensity={0.12} floatIntensity={0.28}>
      <group position={[0, 1.8, 0]}>
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[3.4, 2.2, 1.8]} />
          <meshStandardMaterial color="#cf8a4f" roughness={0.48} metalness={0.18} />
        </mesh>

        <mesh castShadow receiveShadow position={[0, 2.1, 0]}>
          <boxGeometry args={[1.4, 2.4, 1.15]} />
          <meshStandardMaterial color="#e3b271" roughness={0.42} metalness={0.12} />
        </mesh>

        <mesh castShadow receiveShadow position={[-1.1, 2.25, 0]}>
          <cylinderGeometry args={[0.34, 0.48, 3.1, 6]} />
          <meshStandardMaterial color="#9f6d46" roughness={0.5} metalness={0.16} />
        </mesh>

        <mesh castShadow receiveShadow position={[1.1, 2.25, 0]}>
          <cylinderGeometry args={[0.34, 0.48, 3.1, 6]} />
          <meshStandardMaterial color="#9f6d46" roughness={0.5} metalness={0.16} />
        </mesh>

        <mesh castShadow position={[0, 4.2, 0]}>
          <coneGeometry args={[0.5, 1.7, 6]} />
          <meshStandardMaterial color="#f0c891" roughness={0.36} metalness={0.18} />
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
        sunPosition={[4, 1, 6]}
        turbidity={7}
        rayleigh={2.6}
        mieCoefficient={0.006}
        mieDirectionalG={0.9}
      />
      <Stars radius={120} depth={60} count={5000} factor={3.4} saturation={0} fade speed={0.7} />
      <ambientLight intensity={0.9} />
      <directionalLight
        castShadow
        intensity={2.4}
        position={[6, 10, 4]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight intensity={35} angle={0.32} penumbra={0.45} position={[-5, 8, 5]} />
      <GroundPlane />
      <CathedralPlaceholder />
      <gridHelper args={[28, 28, '#5f4639', '#2c2019']} position={[0, 0.01, 0]} />
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
