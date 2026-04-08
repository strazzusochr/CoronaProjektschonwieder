import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, Environment } from '@react-three/drei';
import './index.css';

function CityEnvironment() {
  return (
    <>
      <Sky sunPosition={[100, 10, 100]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
    </>
  );
}

function StephansdomPlaceholder() {
  return (
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default function App() {
  return (
    <div className="canvas-container">
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        <Suspense fallback={null}>
          <CityEnvironment />
          <StephansdomPlaceholder />
          <OrbitControls />
        </Suspense>
      </Canvas>
    </div>
  );
}
