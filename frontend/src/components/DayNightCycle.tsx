/**
 * DayNightCycle — Dynamisches 24-Stunden Beleuchtungssystem
 * 
 * Berechnet Sonnenposition, Ambient-Farbe und Intensität basierend auf der Echtzeit.
 * Nachts: Warme Laternen + Mondlicht. Tags: Helles Sonnenlicht + Himmelblau.
 */

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// 24h Tageszeit → Lichtparameter
function getTimeOfDayParams(hour: number) {
  // Sonnenaufgang: 5-7, Tag: 7-18, Sonnenuntergang: 18-20, Nacht: 20-5
  if (hour >= 5 && hour < 7) {
    // SUNRISE — Goldenes Licht
    const t = (hour - 5) / 2;
    return {
      sunAngle: THREE.MathUtils.lerp(-10, 30, t),
      sunIntensity: THREE.MathUtils.lerp(0.3, 1.5, t),
      ambientIntensity: THREE.MathUtils.lerp(0.15, 0.5, t),
      sunColor: new THREE.Color().lerpColors(new THREE.Color('#ff6633'), new THREE.Color('#ffdd88'), t),
      skyColor: new THREE.Color().lerpColors(new THREE.Color('#1a0a2e'), new THREE.Color('#ff8844'), t),
      fogColor: new THREE.Color().lerpColors(new THREE.Color('#0a0510'), new THREE.Color('#ffaa66'), t),
      phase: 'SONNENAUFGANG',
    };
  } else if (hour >= 7 && hour < 18) {
    // DAYTIME — Helles Tageslicht
    const t = (hour - 7) / 11;
    const midday = 1 - Math.abs(t - 0.5) * 2; // Peak bei 12:30
    return {
      sunAngle: THREE.MathUtils.lerp(30, 70, midday > 0.5 ? 1 - (midday - 0.5) * 2 : midday * 2),
      sunIntensity: THREE.MathUtils.lerp(1.5, 2.5, midday),
      ambientIntensity: THREE.MathUtils.lerp(0.5, 0.8, midday),
      sunColor: new THREE.Color().lerpColors(new THREE.Color('#ffdd88'), new THREE.Color('#ffffee'), midday),
      skyColor: new THREE.Color().lerpColors(new THREE.Color('#4488cc'), new THREE.Color('#88bbff'), midday),
      fogColor: new THREE.Color().lerpColors(new THREE.Color('#667799'), new THREE.Color('#aaccee'), midday),
      phase: 'TAG',
    };
  } else if (hour >= 18 && hour < 20) {
    // SUNSET — Dramatisches Abendrot
    const t = (hour - 18) / 2;
    return {
      sunAngle: THREE.MathUtils.lerp(30, -10, t),
      sunIntensity: THREE.MathUtils.lerp(1.5, 0.3, t),
      ambientIntensity: THREE.MathUtils.lerp(0.5, 0.15, t),
      sunColor: new THREE.Color().lerpColors(new THREE.Color('#ffaa44'), new THREE.Color('#ff4422'), t),
      skyColor: new THREE.Color().lerpColors(new THREE.Color('#cc6633'), new THREE.Color('#1a0a2e'), t),
      fogColor: new THREE.Color().lerpColors(new THREE.Color('#aa5533'), new THREE.Color('#0a0510'), t),
      phase: 'SONNENUNTERGANG',
    };
  } else {
    // NIGHT — Mondlicht + Laternen
    return {
      sunAngle: -20,
      sunIntensity: 0.1,
      ambientIntensity: 0.12,
      sunColor: new THREE.Color('#334466'),
      skyColor: new THREE.Color('#050510'),
      fogColor: new THREE.Color('#050510'),
      phase: 'NACHT',
    };
  }
}

interface DayNightProps {
  speedMultiplier?: number; // 1 = Echtzeit, 60 = 1 Stunde pro Minute
  onPhaseChange?: (phase: string, hour: number) => void;
}

export const DayNightCycle: React.FC<DayNightProps> = ({ speedMultiplier = 60, onPhaseChange }) => {
  const sunRef = useRef<THREE.DirectionalLight>(null!);
  const ambientRef = useRef<THREE.AmbientLight>(null!);
  const moonRef = useRef<THREE.PointLight>(null!);
  const lastPhase = useRef('');

  // Fixe Startzeit: NACHT (22:00) — bester Look für die City-Szene
  const baseHour = useMemo(() => {
    return 22; // Immer bei Nacht starten
  }, []);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    // Simuliere Zeitverlauf: speedMultiplier=60 → 1 Stunde pro Minute
    const simHour = (baseHour + (elapsed * speedMultiplier / 3600)) % 24;
    const params = getTimeOfDayParams(simHour);

    // Sonne
    if (sunRef.current) {
      const angleRad = (params.sunAngle * Math.PI) / 180;
      sunRef.current.position.set(
        Math.cos(angleRad) * 80,
        Math.sin(angleRad) * 80 + 20,
        30
      );
      sunRef.current.intensity = params.sunIntensity;
      sunRef.current.color.copy(params.sunColor);
    }

    // Ambient
    if (ambientRef.current) {
      ambientRef.current.intensity = params.ambientIntensity;
      ambientRef.current.color.copy(params.skyColor);
    }

    // Mond (nur nachts sichtbar)
    if (moonRef.current) {
      const isNight = simHour >= 20 || simHour < 5;
      moonRef.current.intensity = isNight ? 0.4 : 0;
      moonRef.current.position.set(
        Math.cos(elapsed * 0.02) * 100,
        60,
        Math.sin(elapsed * 0.02) * 100
      );
    }

    // Fog dynamisch anpassen
    if (state.scene.fog) {
      (state.scene.fog as THREE.Fog).color.copy(params.fogColor);
    }

    // Phase-Callback
    if (onPhaseChange && params.phase !== lastPhase.current) {
      lastPhase.current = params.phase;
      onPhaseChange(params.phase, Math.floor(simHour));
    }
  });

  return (
    <>
      {/* Dynamische Sonne */}
      <directionalLight
        ref={sunRef}
        position={[50, 50, 30]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={250}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      
      {/* Dynamisches Ambient */}
      <ambientLight ref={ambientRef} intensity={0.5} color="#4488aa" />
      
      {/* Mond */}
      <pointLight ref={moonRef} intensity={0} color="#aabbdd" distance={300} />
      
      {/* Hemisphärisches Licht für natürlichen Look */}
      <hemisphereLight args={['#88aacc', '#443322', 0.4]} />
    </>
  );
};

export default DayNightCycle;
