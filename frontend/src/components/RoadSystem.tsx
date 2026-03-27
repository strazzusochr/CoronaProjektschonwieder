/**
 * RoadSystem — Straßennetz mit Gehwegen, Zebrastreifen und Alleebäumen
 * 
 * Layout:
 * - Kreuzförmige Hauptstraßen (N-S und O-W)
 * - Ringstraße um den Park
 * - Gehwege an den Straßenrändern
 * - Zebrastreifen an den 4 Kreuzungen
 * - Alleebäume entlang der Straßen
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

const dummy = new THREE.Object3D();

export const RoadSystem: React.FC = () => {
  const roadWidth = 16;
  const sidewalkWidth = 4;
  const treeRef = useRef<THREE.InstancedMesh>(null!);
  const treeLeavesRef = useRef<THREE.InstancedMesh>(null!);
  const crosswalkRef = useRef<THREE.InstancedMesh>(null!);

  // Straßenbäume — Alleen entlang der 4 Hauptstraßen
  const streetTreeCount = 80;

  useMemo(() => {
    setTimeout(() => {
      if (!treeRef.current || !treeLeavesRef.current) return;
      let tIdx = 0;

      // Bäume entlang der Nord-Süd Straße (beide Seiten)
      for (let z = -150; z <= 150; z += 8) {
        if (Math.abs(z) < 48) continue; // Park-Zone überspringen
        for (const xOff of [roadWidth / 2 + 3, -(roadWidth / 2 + 3)]) {
          if (tIdx >= streetTreeCount) break;
          const scale = 0.9 + Math.random() * 0.3;
          
          dummy.position.set(xOff, 1.5, z);
          dummy.scale.set(0.3, 3, 0.3);
          dummy.updateMatrix();
          treeRef.current.setMatrixAt(tIdx, dummy.matrix);

          dummy.position.set(xOff, 4 * scale, z);
          dummy.scale.set(scale * 2, scale * 1.5, scale * 2);
          dummy.updateMatrix();
          treeLeavesRef.current.setMatrixAt(tIdx, dummy.matrix);
          tIdx++;
        }
      }

      // Bäume entlang der Ost-West Straße
      for (let x = -150; x <= 150; x += 8) {
        if (Math.abs(x) < 48) continue;
        for (const zOff of [roadWidth / 2 + 3, -(roadWidth / 2 + 3)]) {
          if (tIdx >= streetTreeCount) break;
          const scale = 0.9 + Math.random() * 0.3;
          
          dummy.position.set(x, 1.5, zOff);
          dummy.scale.set(0.3, 3, 0.3);
          dummy.updateMatrix();
          treeRef.current.setMatrixAt(tIdx, dummy.matrix);

          dummy.position.set(x, 4 * scale, zOff);
          dummy.scale.set(scale * 2, scale * 1.5, scale * 2);
          dummy.updateMatrix();
          treeLeavesRef.current.setMatrixAt(tIdx, dummy.matrix);
          tIdx++;
        }
      }

      treeRef.current.count = tIdx;
      treeLeavesRef.current.count = tIdx;
      treeRef.current.instanceMatrix.needsUpdate = true;
      treeLeavesRef.current.instanceMatrix.needsUpdate = true;
    }, 120);

    // Zebrastreifen an den 4 Park-Eingängen
    setTimeout(() => {
      if (!crosswalkRef.current) return;
      let cwIdx = 0;

      // Pro Eingang: 6 weiße Streifen
      const entries = [
        { x: 0, z: 47, rotY: 0 },
        { x: 0, z: -47, rotY: 0 },
        { x: 47, z: 0, rotY: Math.PI / 2 },
        { x: -47, z: 0, rotY: Math.PI / 2 },
      ];

      for (const entry of entries) {
        for (let stripe = 0; stripe < 6; stripe++) {
          if (cwIdx >= 24) break;
          const stripeOffset = (stripe - 2.5) * 2.2;
          
          dummy.position.set(
            entry.x + (entry.rotY === 0 ? stripeOffset : 0),
            0.08,
            entry.z + (entry.rotY !== 0 ? stripeOffset : 0)
          );
          dummy.rotation.set(-Math.PI / 2, 0, entry.rotY);
          dummy.scale.set(1.5, roadWidth * 0.7, 1);
          dummy.updateMatrix();
          crosswalkRef.current.setMatrixAt(cwIdx++, dummy.matrix);
        }
      }
      crosswalkRef.current.count = cwIdx;
      crosswalkRef.current.instanceMatrix.needsUpdate = true;
    }, 130);
  }, []);

  return (
    <group>
      {/* === HAUPTSTRASSEN (N-S und O-W) === */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[roadWidth, 400]} />
        <meshStandardMaterial color="#1a1c1f" roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[400, roadWidth]} />
        <meshStandardMaterial color="#1a1c1f" roughness={0.85} />
      </mesh>

      {/* === GEHWEGE (Hellgrau, entlang der Straßen) === */}
      {/* Nord-Süd Gehwege */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[roadWidth / 2 + sidewalkWidth / 2, 0.04, 0]}>
        <planeGeometry args={[sidewalkWidth, 400]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-(roadWidth / 2 + sidewalkWidth / 2), 0.04, 0]}>
        <planeGeometry args={[sidewalkWidth, 400]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
      </mesh>
      {/* Ost-West Gehwege */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, roadWidth / 2 + sidewalkWidth / 2]}>
        <planeGeometry args={[400, sidewalkWidth]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -(roadWidth / 2 + sidewalkWidth / 2)]}>
        <planeGeometry args={[400, sidewalkWidth]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
      </mesh>

      {/* === RINGSTRASSE um den Park === */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <ringGeometry args={[44, 52, 64]} />
        <meshStandardMaterial color="#1c1e22" roughness={0.85} />
      </mesh>

      {/* Mittelstreifen (gelbe Linie) */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
        <group rotation={[0, angle, 0]} key={i}>
          <mesh position={[0, 0.05, 120]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.3, 160]} />
            <meshBasicMaterial color="#ccaa00" transparent opacity={0.6} />
          </mesh>
        </group>
      ))}

      {/* === ZEBRASTREIFEN (weiße Streifen auf dem Boden) === */}
      <instancedMesh ref={crosswalkRef} args={[undefined, undefined, 24]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </instancedMesh>

      {/* === ALLEEBÄUME (entlang der Straßen) === */}
      <instancedMesh ref={treeRef} args={[undefined, undefined, streetTreeCount]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 1, 6]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={treeLeavesRef} args={[undefined, undefined, streetTreeCount]} castShadow>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial color="#2d8a3e" roughness={0.85} />
      </instancedMesh>
    </group>
  );
};

export default RoadSystem;
