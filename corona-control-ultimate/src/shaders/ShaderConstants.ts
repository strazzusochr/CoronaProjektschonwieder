/**
 * Corona Control Ultimate - Shader Konstanten
 * Gemäß V6.0 Spezifikation (Anhang C)
 * 
 * Shader-Transitionstabelle für Sonnenaufgang (06:00:00)
 * Diese Werte sind die "unveränderliche Wahrheit" für die Interpolation
 */

/**
 * Sonnenaufgangs-Transition Keyframes (5 Sekunden Realzeit)
 */
export const SUNRISE_TRANSITION = [
    {
        realTime: 0.0,      // T=0 (06:00:00)
        sunElevation: -18,  // Grad
        directionalLux: 0,
        fogDensity: 0.008,
        streetLights: 'ON',
        streetLightIntensity: 800, // Lumen
        audioLayer0: -12,   // dB
        skyZenithColor: { r: 15, g: 15, b: 45 }  // Tiefes Nachtblau
    },
    {
        realTime: 1.0,
        sunElevation: -12,
        directionalLux: 50,
        fogDensity: 0.008,
        streetLights: 'ON',
        streetLightIntensity: 800,
        audioLayer0: -15,
        skyHorizonColor: { r: 120, g: 60, b: 40 }  // Orange-Verlauf
    },
    {
        realTime: 2.0,
        sunElevation: -6,
        directionalLux: 500,
        fogDensity: 0.007,
        streetLights: 'ON',
        streetLightIntensity: 800,
        audioLayer0: -18,
        godRaysActive: true,
        godRaySamples: 64,
        godRayDecay: 0.95
    },
    {
        realTime: 3.0,
        sunElevation: -3,
        directionalLux: 2000,
        fogDensity: 0.006,
        streetLights: 'FLICKER',  // Flacker-Sequenz
        streetLightIntensity: 400,
        audioLayer0: -25
    },
    {
        realTime: 4.0,
        sunElevation: 0,  // Horizont
        directionalLux: 5000,
        fogDensity: 0.005,
        streetLights: 'OFF',
        streetLightIntensity: 0,
        audioLayer0: -Infinity
    },
    {
        realTime: 5.0,
        sunElevation: 3,
        directionalLux: 15000,  // Tageslicht
        fogDensity: 0.004,
        streetLights: 'OFF',
        streetLightIntensity: 0,
        audioLayer0: -Infinity,
        ambientLight: 0.6,
        starsOpacity: 0
    }
] as const;

/**
 * Farb-Hexcodes für UI-Tageszeiten
 */
export const UI_TIME_COLORS = {
    MORNING: '#FFA500',  // Orange
    MIDDAY: '#FFD700',   // Gold
    EVENING: '#4169E1',  // Royal Blue
    NIGHT: '#191970'     // Midnight Blue
} as const;

/**
 * Material-Roughness für Oberflächen-Thermodynamik
 * Werte verschieben sich linear von 06:00 bis 09:00
 */
export const SURFACE_THERMODYNAMICS = {
    asphalt: { wet: 0.2, dry: 0.8 },
    concrete: { wet: 0.25, dry: 0.75 },
    cobblestone: { wet: 0.15, dry: 0.7 }
} as const;

/**
 * Wind-Vektor für thermische Dynamik
 */
export const THERMAL_WIND = {
    night: { x: 0, y: 0, z: 0 },
    morning: { x: 0.5, y: 0, z: 0.2 },
    midday: { x: 0.8, y: 0, z: 0.4 },
    evening: { x: 0.3, y: 0, z: 0.1 }
} as const;

/**
 * Laternen-Flicker-Sequenz (Frame-basiert)
 * StartZeit = 06:03:00 + (Laternen_ID * 0.033s)
 */
export const LANTERN_FLICKER_SEQUENCE = {
    frames: [
        { start: 0, end: 5, intensity: 400 },    // Dimmen auf 400lm
        { start: 6, end: 10, intensity: 800 },   // Erholen auf 800lm
        { start: 11, end: 14, intensity: 200 },  // Dimmen auf 200lm
        { start: 15, end: 24, intensity: 200 },  // Halten
        { start: 25, end: 25, intensity: 0 }     // Abschalten
    ],
    propagationDelayPerLantern: 0.033,  // Sekunden
    direction: 'EAST_TO_WEST',
    totalLanterns: 247
} as const;

/**
 * Interpoliert zwischen zwei Transition-Keyframes
 */
export function interpolateSunrise(realTimeSeconds: number): {
    sunElevation: number;
    directionalLux: number;
    fogDensity: number;
    streetLightIntensity: number;
} {
    // Clamp auf 0-5 Sekunden
    const t = Math.max(0, Math.min(5, realTimeSeconds));

    // Finde die zwei umgebenden Keyframes
    let from = SUNRISE_TRANSITION[0];
    let to = SUNRISE_TRANSITION[1];

    for (let i = 0; i < SUNRISE_TRANSITION.length - 1; i++) {
        if (t >= SUNRISE_TRANSITION[i].realTime && t < SUNRISE_TRANSITION[i + 1].realTime) {
            from = SUNRISE_TRANSITION[i];
            to = SUNRISE_TRANSITION[i + 1];
            break;
        }
    }

    // Interpolationsfaktor
    const factor = (t - from.realTime) / (to.realTime - from.realTime);

    // Lineare Interpolation
    return {
        sunElevation: from.sunElevation + (to.sunElevation - from.sunElevation) * factor,
        directionalLux: from.directionalLux + (to.directionalLux - from.directionalLux) * factor,
        fogDensity: from.fogDensity + (to.fogDensity - from.fogDensity) * factor,
        streetLightIntensity: from.streetLightIntensity + (to.streetLightIntensity - from.streetLightIntensity) * factor
    };
}
