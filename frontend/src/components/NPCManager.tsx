import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { Sphere, Text } from '@react-three/drei';

const NPCManager: React.FC = () => {
  const npcs = useGameStore((state) => state.npcs);
  const npcList = useMemo(() => Object.values(npcs), [npcs]);

  return (
    <>
      {npcList.map((npc) => (
        <group key={npc.id} position={npc.position}>
          {/* NPC Visual Body */}
          <Sphere args={[0.8, 32, 32]}>
            <meshStandardMaterial 
              color={npc.type === 'demonstrator' ? '#ff4081' : npc.type === 'official' ? '#3f51b5' : '#8bc34a'} 
              emissive={npc.type === 'demonstrator' ? '#ff4081' : '#000000'}
              emissiveIntensity={0.5}
            />
          </Sphere>
          
          {/* NPC Status Label */}
          <Text
            position={[0, 1, 0]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {`${npc.type.toUpperCase()}\nStatus: ${npc.action}`}
          </Text>
        </group>
      ))}
    </>
  );
};

export default NPCManager;
