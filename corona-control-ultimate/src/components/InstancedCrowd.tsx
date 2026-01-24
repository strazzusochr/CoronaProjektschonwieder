import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';

/**
 * InstancedCrowd - Optimierte Darstellung für ferne NPCs
 * 
 * Verwendet InstancedMesh für NPCs > 40m vom Spieler entfernt.
 * Diese haben keine Physik-Kollision, aber reduzieren Draw-Calls massiv.
 * 
 * Basierend auf 03_PHASE_2_5_ULTRA.md (ANGLE-instanced-arrays)
 */

interface InstancedCrowdProps {
    maxInstances?: number;
    distanceThreshold?: number;
}

const InstancedCrowd: React.FC<InstancedCrowdProps> = ({ 
    maxInstances = 500, 
    distanceThreshold = 50 
}) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const npcs = useGameStore(state => state.npcs);
    const playerPos = useGameStore(state => state.player.position);
    
    // Dummy-Matrix für Transformationen
    const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
    const tempPosition = useMemo(() => new THREE.Vector3(), []);
    const tempQuaternion = useMemo(() => new THREE.Quaternion(), []);
    const tempScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
    
    // Farbpalette für NPC-Typen
    const colorPalette = useMemo(() => ({
        CIVILIAN: new THREE.Color('#7CB342'),
        RIOTER: new THREE.Color('#8E0000'),
        POLICE: new THREE.Color('#002266'),
        TOURIST: new THREE.Color('#4CAF50'),
    }), []);
    
    // Geometrie und Material (nur einmal erstellt)
    const geometry = useMemo(() => new THREE.CapsuleGeometry(0.3, 1.2, 4, 8), []);
    const material = useMemo(() => new THREE.MeshStandardMaterial({ 
        vertexColors: false,
        metalness: 0.1,
        roughness: 0.8
    }), []);
    
    useFrame(() => {
        if (!meshRef.current) return;
        
        let instanceIndex = 0;
        
        for (const npc of npcs) {
            // Berechne Distanz zum Spieler
            const dx = playerPos[0] - npc.position[0];
            const dz = playerPos[2] - npc.position[2];
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Nur ferne NPCs als Instanzen rendern
            if (distance > distanceThreshold && instanceIndex < maxInstances) {
                tempPosition.set(npc.position[0], npc.position[1], npc.position[2]);
                // Rotation basierend auf ID (deterministisch)
                const rotation = (npc.id * 0.5) % (Math.PI * 2);
                tempQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
                
                tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
                meshRef.current.setMatrixAt(instanceIndex, tempMatrix);
                
                // Farbe basierend auf Typ
                const color = colorPalette[npc.type as keyof typeof colorPalette] || colorPalette.CIVILIAN;
                meshRef.current.setColorAt(instanceIndex, color);
                
                instanceIndex++;
            }
        }
        
        // Aktualisiere nur genutzte Instanzen
        meshRef.current.count = instanceIndex;
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        }
    });
    
    return (
        <instancedMesh 
            ref={meshRef} 
            args={[geometry, material, maxInstances]}
            frustumCulled={true}
        >
            <capsuleGeometry args={[0.3, 1.2, 4, 8]} />
            <meshStandardMaterial vertexColors={true} />
        </instancedMesh>
    );
};

export default InstancedCrowd;
