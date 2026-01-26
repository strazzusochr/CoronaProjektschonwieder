
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import AudioSystem from '@/systems/AudioSystem';

interface SpatialAudioSourceProps {
    url?: string; // Optional for placeholder
    loop?: boolean;
    volume?: number;
    autoplay?: boolean;
    distance?: number;
}

const SpatialAudioSource: React.FC<SpatialAudioSourceProps> = ({
    url,
    loop = false,
    volume = 1,
    autoplay = false,
    distance = 20
}) => {
    const sound = useRef<THREE.PositionalAudio>();
    const { camera } = useThree();

    useEffect(() => {
        const listener = AudioSystem.getInstance().getListener();

        // Create Sound
        const newSound = new THREE.PositionalAudio(listener);

        // Create Oscillator for Placeholder if no URL
        if (!url) {
            // We can't easily create an oscillator source in THREE.PositionalAudio without a buffer
            // So we just create a silent buffer or skip
            // For prototype, we assume we might load a buffer later
        } else {
            // Load logic would go here
        }

        newSound.setRefDistance(1);
        newSound.setMaxDistance(distance);
        newSound.setLoop(loop);
        newSound.setVolume(volume);

        // Add Filter for Occlusion
        const filter = listener.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 20000;
        newSound.setFilter(filter);

        sound.current = newSound;
        AudioSystem.getInstance().registerSource(newSound);

        return () => {
            if (sound.current) {
                if (sound.current.isPlaying) sound.current.stop();
                AudioSystem.getInstance().unregisterSource(sound.current);
            }
        };
    }, [url, loop, volume, distance]);

    return (
        <group>
            {/* Visual Debug Helper */}
            {/* <mesh>
                <sphereGeometry args={[0.2, 8, 8]} />
                <meshBasicMaterial color="yellow" wireframe />
            </mesh> */}
            {sound.current && <primitive object={sound.current} />}
        </group>
    );
};

export default SpatialAudioSource;
