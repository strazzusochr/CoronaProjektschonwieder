/**
 * Corona Control Ultimate - Dynamic Lighting System
 * Gemäß V6.0 Spezifikation: 24-Stunden Beleuchtungszyklus
 * 
 * Implementiert:
 * - Sonnenaufgangs-Transition (Anhang C)
 * - Tageszeit-basierte Beleuchtung
 * - Laternen-Steuerung
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';
import TimeSystem from '@/core/TimeSystem';
import { useTimeEngine } from '@/core/TimeEngine';


interface DynamicLightingProps {
    quality: 'LOW' | 'MEDIUM' | 'HIGH';
    castShadows?: boolean;
}

/**
 * Berechnet Sonnenposition basierend auf Spielzeit
 */
/**
 * Berechnet Sonnenposition basierend auf Spielzeit
 * V6.0 Table C Alignment: 06:00:00 (T=0) -> T=5.0s
 */
function calculateSunPosition(gameMinutes: number): [number, number, number] {
    const hour = gameMinutes / 60;

    // SUNRISE TABLE C OVERRIDE (06:00:00 - 06:00:05)
    if (gameMinutes >= 360 && gameMinutes <= 360.0833) { // 360.0833 min = 5 game seconds
        const t = (gameMinutes - 360) * 60; // seconds 0-5
        const elevationTable = [-18, -12, -6, -3, 0, 3];
        const idx = Math.floor(t);
        const frac = t % 1;
        const elevation = THREE.MathUtils.lerp(elevationTable[idx], elevationTable[idx + 1] || 3, frac);

        const azimuth = Math.PI / 2; // East
        const dist = 100;
        const elRad = THREE.MathUtils.degToRad(elevation);
        return [
            Math.cos(azimuth) * Math.cos(elRad) * dist,
            Math.sin(elRad) * dist,
            Math.sin(azimuth) * Math.cos(elRad) * dist
        ];
    }

    // Normal calculation... (simplified fallback)
    const azimuth = ((hour - 6) / 24) * Math.PI * 2;
    let elevation: number;
    if (hour >= 6 && hour <= 18) {
        elevation = Math.sin(((hour - 6) / 12) * Math.PI) * 70;
    } else {
        elevation = -30;
    }

    const dist = 100;
    const elRad = THREE.MathUtils.degToRad(elevation);
    return [
        Math.cos(azimuth) * Math.cos(elRad) * dist,
        Math.sin(elRad) * dist,
        Math.sin(azimuth) * Math.cos(elRad) * dist
    ];
}

/**
 * Berechnet Lichtintensität basierend auf Tageszeit
 * V6.0 Table C Alignment
 */
function calculateLightIntensity(gameMinutes: number): {
    directional: number;
    ambient: number;
    starsOpacity: number;
    streetLights: boolean;
    flicker: boolean;
} {
    const hour = gameMinutes / 60;
    let flicker = false;

    // SUNRISE TABLE C OVERRIDE
    if (gameMinutes >= 360 && gameMinutes <= 360.0833) {
        const t = (gameMinutes - 360) * 60;
        const luxTable = [0, 50, 500, 2000, 5000, 15000];
        const idx = Math.floor(t);
        const frac = t % 1;
        const lux = THREE.MathUtils.lerp(luxTable[idx], luxTable[idx + 1] || 15000, frac);

        const directional = (lux / 10000); // 1.5 intensity at 15k lux approx
        const ambient = 0.05 + (lux / 30000);
        const streetLights = t < 5;
        flicker = t >= 3 && t < 4;

        return { directional, ambient, starsOpacity: Math.max(0, 1 - t / 2), streetLights, flicker };
    }

    const res = {
        directional: hour >= 6 && hour <= 18 ? 0.5 + Math.sin(((hour - 6) / 12) * Math.PI) * 1.5 : 0.15,
        ambient: hour >= 6 && hour <= 18 ? 0.4 + Math.sin(((hour - 6) / 12) * Math.PI) * 0.4 : 0.2, // Higher minimum ambient
        starsOpacity: hour >= 20 || hour < 5 ? 1 : 0,
        streetLights: hour >= 18 || hour < 6, // Turn on at 18:00
        flicker: false
    };

    return res;
}

/**
 * Berechnet Himmelfarben basierend auf Tageszeit
 */
function calculateSkyColors(gameMinutes: number): {
    turbidity: number;
    rayleigh: number;
    sunColor: THREE.Color;
} {
    if (gameMinutes >= 360 && gameMinutes <= 360.0833) {
        const t = (gameMinutes - 360) * 60;
        // Fog/turbidity interpolation
        // Table C: T=0:0.008, T=2:0.007, T=3:0.006, T=4:0.005, T=5:0.004
        const fogTable = [0.008, 0.008, 0.007, 0.006, 0.005, 0.004];
        const idx = Math.floor(t);
        const frac = t % 1;
        const fog = THREE.MathUtils.lerp(fogTable[idx], fogTable[idx + 1] || 0.004, frac);

        return {
            turbidity: 20 * (fog / 0.008),
            rayleigh: 1.0 - (fog / 0.008) + 0.1,
            sunColor: new THREE.Color(0xFFAA44).lerp(new THREE.Color(0xFFFFF0), t / 5)
        };
    }

    const gameTimeSeconds = useTimeEngine.getState().gameTimeSeconds;
    const hour = gameTimeSeconds / 3600;

    // Simplistic phase logic for sky colors
    let phase: 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT' = 'NIGHT';
    if (hour >= 6 && hour < 12) phase = 'MORNING';
    else if (hour >= 12 && hour < 18) phase = 'MIDDAY';
    else if (hour >= 18 && hour < 22) phase = 'EVENING';
    switch (phase) {
        case 'MORNING': return { turbidity: 6, rayleigh: 1.0, sunColor: new THREE.Color(0xFFAA44) };
        case 'MIDDAY': return { turbidity: 8, rayleigh: 0.5, sunColor: new THREE.Color(0xFFFFF0) };
        case 'EVENING': return { turbidity: 10, rayleigh: 2.0, sunColor: new THREE.Color(0xFF6633) };
        case 'NIGHT':
        default: return { turbidity: 20, rayleigh: 0.1, sunColor: new THREE.Color(0x4466AA) };
    }
}

/**
 * Dynamisches Beleuchtungs-System Komponente
 */
const DynamicLighting: React.FC<DynamicLightingProps> = ({ quality, castShadows = false }) => {
    const directionalLightRef = useRef<THREE.DirectionalLight>(null);
    const fillLightRef = useRef<THREE.DirectionalLight>(null);
    const rimLightRef = useRef<THREE.DirectionalLight>(null);

    // CPU MODE: Forced low map size
    const shadowMapSize = 512;

    // Aktualisiere Licht jeden Frame basierend auf Spielzeit
    useFrame(() => {
        const gameMinutes = useTimeEngine.getState().gameTimeSeconds / 60;
        const sunPosition = calculateSunPosition(gameMinutes);
        const intensity = calculateLightIntensity(gameMinutes);
        const skyColors = calculateSkyColors(gameMinutes);

        if (directionalLightRef.current) {
            directionalLightRef.current.position.set(...sunPosition);
            directionalLightRef.current.intensity = intensity.directional;
            directionalLightRef.current.color.copy(skyColors.sunColor);
        }

        if (fillLightRef.current) {
            fillLightRef.current.intensity = intensity.directional * 0.3;
        }

        if (rimLightRef.current) {
            rimLightRef.current.intensity = intensity.directional * 0.2;
        }
    });

    return (
        <>
            {/* PBR Environment (Image Based Lighting) - CPU LIGHTWEIGHT */}
            {/* Using standard preset, ensuring CSP allows fonts.gstatic.com for assets */}
            <Environment preset="apartment" background={false} />

            {/* Hemisphere Light (Himmel/Boden) - Best for CPU performance */}
            <hemisphereLight args={[0xB4D4FF, 0x504030, 0.7]} />

            {/* Hauptlicht (Sonne/Mond) - NO SHADOWS ON CPU */}
            <directionalLight
                ref={directionalLightRef}
                position={[80, 100, 60]}
                intensity={1.5}
                castShadow={false}
            />


            {/* Fill Light (weiche Schatten) */}
            <directionalLight
                ref={fillLightRef}
                position={[-50, 50, -50]}
                intensity={0.4}
                castShadow={false}
                color={0xFFFFFF}
            />

            {/* Rim Light (Hintergrundbeleuchtung) */}
            <directionalLight
                ref={rimLightRef}
                position={[0, 30, -80]}
                intensity={0.3}
                castShadow={false}
                color={0xB0C4DE}
            />

            {/* Ambient Light */}
            <ambientLight intensity={0.15} color={0xFFFFFF} />
        </>
    );
};

/**
 * Dynamischer Himmel basierend auf Tageszeit
 */
export const DynamicSky: React.FC = () => {
    const skyRef = useRef<any>(null);

    useFrame(() => {
        if (!skyRef.current) return;
        const gameMinutes = useTimeEngine.getState().gameTimeSeconds / 60;
        const sunPosition = calculateSunPosition(gameMinutes);
        const skyColors = calculateSkyColors(gameMinutes);

        // Sky Material aktualisieren
        if (skyRef.current.material) {
            skyRef.current.material.uniforms.turbidity.value = skyColors.turbidity;
            skyRef.current.material.uniforms.rayleigh.value = skyColors.rayleigh;
            skyRef.current.material.uniforms.sunPosition.value.set(...sunPosition);
        }
    });

    return (
        <>
            <Sky
                ref={skyRef}
                sunPosition={[100, 60, 50]}
                turbidity={8}
                rayleigh={0.5}
                mieCoefficient={0.005}
                mieDirectionalG={0.8}
            />
            <Stars
                radius={300}
                depth={60}
                count={5000}
                factor={4}
                saturation={0.5}
            />
        </>
    );
};

export default DynamicLighting;
export { calculateSunPosition, calculateLightIntensity, calculateSkyColors };
