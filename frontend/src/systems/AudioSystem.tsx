import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';

export const AudioSystem: React.FC = () => {
  const { camera } = useThree();
  const listener = useRef<THREE.AudioListener>(null!);
  const worldTime = useGameStore((state) => state.worldTime);


  useEffect(() => {
    listener.current = new THREE.AudioListener();
    camera.add(listener.current);
    
    return () => {
      camera.remove(listener.current);
    };
  }, [camera]);

  // Handle timed events like Church Bells & Subway
  useEffect(() => {
    if (worldTime === '06:00') {
      console.log('--- AUDIO: CHURCH BELLS TRIGGERED (06:00:00)');
    }

    // Subway every 5 minutes (approx)
    if (worldTime.startsWith('08:') || worldTime.startsWith('09:')) {
      const minutes = parseInt(worldTime.split(':')[1]);
      if (minutes % 5 === 0) {
        console.log(`--- AUDIO: SUBWAY ARRIVAL RUMBLE (${worldTime})`);
      }
    }

    // Phase 18: Distant Chanting & Police Radio
    if (worldTime === '10:00') {
      console.log('--- AUDIO: DISTANT CHANTING STARTS (Ambience: 10:00)');
    }
    if (worldTime === '11:00') {
      console.log('--- AUDIO: POLICE RADIO CHATTER INTENSIFIES (Ambience: 11:00)');
    }
  }, [worldTime]);



  return null;
};
