import React from 'react';
import { Sphere, Text } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';

const NPCManager: React.FC = () => {
  const npcs = useGameStore((state) => state.npcs);
  const npcList = Object.values(npcs);

  return (
    <>
      {npcList.map((npc) => (
        <group key={npc.id} position={npc.position}>
          {/* NPC Visual Body - High Visibility [V4 PRO] */}
          <Sphere args={[0.8, 32, 32]}>
            <meshStandardMaterial 
              color={npc.type === 'demonstrator' ? '#ff4081' : npc.type === 'official' ? '#3f51b5' : '#8bc34a'} 
              emissive={npc.type === 'demonstrator' ? '#ff4081' : '#000000'}
              emissiveIntensity={0.5}
              metalness={0.6}
              roughness={0.2}
            />
          </Sphere>

          {/* NPC Label */}
          <Text
            position={[0, 1.2, 0]}
            fontSize={0.3}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {`${npc.type.toUpperCase()}: ${npc.action}`}
          </Text>
        </group>
      ))}
    </>
  );
};

export default NPCManager;
