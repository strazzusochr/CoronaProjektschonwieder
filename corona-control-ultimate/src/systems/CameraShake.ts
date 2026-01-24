import * as THREE from 'three';

/**
 * Camera-Shake-System für Corona Control Ultimate
 * Basierend auf 03_PHASE_2_5_ULTRA.md (Zeilen 1239-1283)
 * 
 * Trigger: Explosionen, Kollisionen, Treffer
 */

interface ShakeInstance {
    startTime: number;
    duration: number;
    intensity: number;
    frequency: number;
    decay: number;
}

class CameraShakeSystem {
    private static instance: CameraShakeSystem;
    private activeShakes: ShakeInstance[] = [];
    private noiseOffset: THREE.Vector2 = new THREE.Vector2(0, 0);
    
    private constructor() {
        // Singleton
    }
    
    static getInstance(): CameraShakeSystem {
        if (!CameraShakeSystem.instance) {
            CameraShakeSystem.instance = new CameraShakeSystem();
        }
        return CameraShakeSystem.instance;
    }
    
    /**
     * Löst einen neuen Kamera-Shake aus
     * @param intensity Stärke (0.0 - 1.0)
     * @param duration Dauer in Sekunden
     * @param frequency Oszillationen pro Sekunde (Standard: 15)
     */
    shake(intensity: number = 0.3, duration: number = 0.5, frequency: number = 15): void {
        const shake: ShakeInstance = {
            startTime: performance.now() / 1000,
            duration,
            intensity,
            frequency,
            decay: 2.0 // Exponentieller Abfall
        };
        this.activeShakes.push(shake);
    }
    
    /**
     * Starker Shake bei Explosionen
     */
    explosionShake(): void {
        this.shake(0.6, 0.8, 20);
    }
    
    /**
     * Mittlerer Shake bei Treffern
     */
    hitShake(): void {
        this.shake(0.3, 0.3, 15);
    }
    
    /**
     * Leichter Shake bei Kollisionen
     */
    collisionShake(): void {
        this.shake(0.15, 0.2, 10);
    }
    
    /**
     * Berechnet den aktuellen Shake-Offset
     * Muss jeden Frame aufgerufen werden
     * @returns Offset-Vektor für Kamera-Position
     */
    update(): THREE.Vector3 {
        const offset = new THREE.Vector3(0, 0, 0);
        const currentTime = performance.now() / 1000;
        
        // Entferne abgelaufene Shakes
        this.activeShakes = this.activeShakes.filter(shake => {
            const elapsed = currentTime - shake.startTime;
            return elapsed < shake.duration;
        });
        
        // Kombiniere alle aktiven Shakes
        for (const shake of this.activeShakes) {
            const elapsed = currentTime - shake.startTime;
            const progress = elapsed / shake.duration;
            
            // Exponentieller Falloff
            const falloff = Math.pow(1 - progress, shake.decay);
            
            // Perlin-Noise-ähnliche Oszillation (vereinfacht mit Sinus)
            const noiseX = Math.sin(elapsed * shake.frequency + this.noiseOffset.x) * 
                          Math.cos(elapsed * shake.frequency * 1.3);
            const noiseY = Math.sin(elapsed * shake.frequency * 0.9 + this.noiseOffset.y) * 
                          Math.cos(elapsed * shake.frequency * 1.1);
            const noiseZ = Math.sin(elapsed * shake.frequency * 1.1) * 
                          Math.cos(elapsed * shake.frequency * 0.8);
            
            // Skaliere mit Intensität und Falloff
            offset.x += noiseX * shake.intensity * falloff * 0.1;
            offset.y += noiseY * shake.intensity * falloff * 0.1;
            offset.z += noiseZ * shake.intensity * falloff * 0.05;
        }
        
        // Aktualisiere Noise-Offset für Variation
        this.noiseOffset.x += 0.01;
        this.noiseOffset.y += 0.015;
        
        return offset;
    }
    
    /**
     * Prüft ob gerade ein Shake aktiv ist
     */
    isShaking(): boolean {
        return this.activeShakes.length > 0;
    }
    
    /**
     * Stoppt alle aktiven Shakes
     */
    stopAll(): void {
        this.activeShakes = [];
    }
}

export default CameraShakeSystem;
