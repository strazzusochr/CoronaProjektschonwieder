
import * as THREE from 'three';
import { useGameStore } from '@/stores/gameStore';

class AudioSystem {
    private static instance: AudioSystem;
    private listener: THREE.AudioListener;
    private audioContext: AudioContext | null = null;
    private sources: Set<THREE.PositionalAudio> = new Set();

    // Occlusion Settings
    private raycaster: THREE.Raycaster;
    private occlusionLayerMask: THREE.Layers;

    private constructor() {
        this.listener = new THREE.AudioListener();
        this.raycaster = new THREE.Raycaster();

        // Setup Occlusion Layer (Layer 0 = Default/Walls)
        this.occlusionLayerMask = new THREE.Layers();
        this.occlusionLayerMask.set(0);
    }

    public static getInstance(): AudioSystem {
        if (!AudioSystem.instance) {
            AudioSystem.instance = new AudioSystem();
        }
        return AudioSystem.instance;
    }

    public getListener(): THREE.AudioListener {
        return this.listener;
    }

    public init(camera: THREE.Camera) {
        camera.add(this.listener);
        this.audioContext = this.listener.context;
        console.log('AudioSystem initialized');
    }

    public registerSource(source: THREE.PositionalAudio) {
        this.sources.add(source);
    }

    public unregisterSource(source: THREE.PositionalAudio) {
        this.sources.delete(source);
    }

    public update(delta: number, camera: THREE.Camera, scene: THREE.Scene) {
        if (!this.audioContext) return;

        // Simple Occlusion Check for registered sources
        // In production, we would limit this to N closest sources per frame
        this.sources.forEach(source => {
            if (!source.isPlaying) return;

            const sourcePos = new THREE.Vector3();
            source.getWorldPosition(sourcePos);

            const listenerPos = camera.position;
            const direction = new THREE.Vector3().subVectors(sourcePos, listenerPos).normalize();
            const distance = sourcePos.distanceTo(listenerPos);

            this.raycaster.set(listenerPos, direction);
            this.raycaster.far = distance;

            // Check for obstacles
            // Note: This requires scene objects to be in the correct layer or passed here
            // For now, we assume scene.children contains walls
            const intersects = this.raycaster.intersectObjects(scene.children, true);

            let occlusion = 0;
            if (intersects.length > 0) {
                // If we hit something that is NOT the source itself (simplified check)
                // In a real engine, we'd filter out the source object or use collision masks
                occlusion = 0.5; // 50% muffled
            }

            // Apply LowPass Filter based on occlusion
            if (source.filters.length > 0) {
                const filter = source.filters[0] as BiquadFilterNode;
                if (occlusion > 0) {
                    filter.frequency.value = 500; // Muffled
                } else {
                    filter.frequency.value = 20000; // Clear
                }
            }
        });
    }
}

export default AudioSystem;
