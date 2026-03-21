import * as THREE from 'three';

export class AudioManager {
    private listener: THREE.AudioListener;
    private sounds: Map<string, THREE.PositionalAudio> = new Map();
    private audioLoader: THREE.AudioLoader;

    constructor(camera: THREE.Camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);
        this.audioLoader = new THREE.AudioLoader();
    }

    // [WIRED-AUDIO] Lädt einen Sound und verknüpft ihn mit einem 3D-Objekt
    public async loadSpatialSound(name: string, url: string, parent: THREE.Object3D, loop: boolean = true) {
        return new Promise((resolve) => {
            this.audioLoader.load(url, (buffer) => {
                const sound = new THREE.PositionalAudio(this.listener);
                sound.setBuffer(buffer);
                sound.setRefDistance(2);
                sound.setLoop(loop);
                sound.setVolume(0.5);
                parent.add(sound);
                this.sounds.set(name, sound);
                console.log(`[WIRED-AUDIO] Loaded: ${name} onto ${parent.type}`);
                resolve(sound);
            });
        });
    }

    public play(name: string) {
        const sound = this.sounds.get(name);
        if (sound && !sound.isPlaying) {
            sound.play();
            console.log(`[WIRED-AUDIO] Playing: ${name}`);
        }
    }

    public stop(name: string) {
        const sound = this.sounds.get(name);
        if (sound && sound.isPlaying) {
            sound.stop();
        }
    }

    public setVolume(name: string, volume: number) {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.setVolume(volume);
        }
    }

    // Synthetischer Sound-Generator (für Cloud-Umgebungen ohne Assets)
    public createOscillatorSound(name: string, parent: THREE.Object3D, freq: number = 440) {
        const sound = new THREE.PositionalAudio(this.listener);
        const osc = this.listener.context.createOscillator();
        const gain = this.listener.context.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.listener.context.currentTime);
        gain.gain.setValueAtTime(0, this.listener.context.currentTime);
        
        osc.connect(gain);
        // Positional Audio Node
        const pNode = sound.getOutput();
        gain.connect(pNode);
        
        osc.start();
        parent.add(sound);
        this.sounds.set(name, sound);
        console.log(`[WIRED-AUDIO] Created Synth: ${name} (Freq: ${freq}Hz)`);
    }
}
