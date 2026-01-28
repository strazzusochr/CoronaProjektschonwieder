/**
 * Corona Control Ultimate - Rendering Pipeline
 * Gemäß V6.0 Spezifikation: 4-Pass Render-Pipeline
 * 
 * 1. Geometry Pass (G-Buffer) - MRT für Deferred Rendering
 * 2. Lighting Pass (Accumulation) - Compute für 100+ Lichter
 * 3. Post-Processing Pass - Bloom, God-Rays, Color Grading
 * 4. UI Overlay Pass - HUD über 3D-Szene
 */

// Re-export der Post-Processing Effekte
export { EffectComposer } from '@react-three/postprocessing';
export { Bloom, ToneMapping, SMAA, Vignette } from '@react-three/postprocessing';

/**
 * Post-Processing Presets für verschiedene Tageszeiten
 */
export const POST_PROCESSING_PRESETS = {
    MORNING: {
        bloomIntensity: 0.3,
        bloomThreshold: 0.8,
        toneMapping: { exposure: 1.0 },
        colorGrading: { hue: 20, saturation: 1.1 }
    },
    MIDDAY: {
        bloomIntensity: 0.2,
        bloomThreshold: 0.9,
        toneMapping: { exposure: 1.2 },
        colorGrading: { hue: 0, saturation: 1.0 }
    },
    EVENING: {
        bloomIntensity: 0.4,
        bloomThreshold: 0.7,
        toneMapping: { exposure: 0.9 },
        colorGrading: { hue: -10, saturation: 1.2 }  // Golden Hour
    },
    NIGHT: {
        bloomIntensity: 0.5,
        bloomThreshold: 0.6,
        toneMapping: { exposure: 0.7 },
        colorGrading: { hue: -30, saturation: 0.8 }  // Bläulich
    }
} as const;

/**
 * LOD-Distanzen für verschiedene Detail-Stufen
 * Gemäß V6.0 Spezifikation
 */
export const LOD_DISTANCES = {
    LOD_0_ULTRA: 10,    // < 10m: Volle Geometrie, Cloth
    LOD_1_HIGH: 30,     // 10-30m: Reduzierte Poly
    LOD_2_MEDIUM: 100,  // 30-100m: Vereinfachte Skeleton
    LOD_3_LOW: 300,     // 100-300m: Impostors
    LOD_4_BILLBOARD: Infinity  // > 300m: Billboards
} as const;

/**
 * Berechnet LOD-Level basierend auf Distanz zur Kamera
 */
export function getLODLevel(distanceToCamera: number): 0 | 1 | 2 | 3 | 4 {
    if (distanceToCamera < LOD_DISTANCES.LOD_0_ULTRA) return 0;
    if (distanceToCamera < LOD_DISTANCES.LOD_1_HIGH) return 1;
    if (distanceToCamera < LOD_DISTANCES.LOD_2_MEDIUM) return 2;
    if (distanceToCamera < LOD_DISTANCES.LOD_3_LOW) return 3;
    return 4;
}

/**
 * Shadow-Konfiguration für verschiedene Quality-Levels
 */
export const SHADOW_CONFIG = {
    LOW: {
        mapSize: 512,
        cascades: 1,
        bias: 0.0001
    },
    MEDIUM: {
        mapSize: 1024,
        cascades: 2,
        bias: 0.00005
    },
    HIGH: {
        mapSize: 2048,
        cascades: 4,
        bias: 0.00001
    }
} as const;
