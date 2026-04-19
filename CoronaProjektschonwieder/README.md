# Godmode Arena Lab

Neues 3D-Testspiel-Projekt als Ersatz fuer den alten Corona-Prototyp.
Der Fokus liegt auf vollstaendig testbaren Steuerungen und stabiler Build-
und Browser-Validierung.

## Setup

```bash
npm install
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run test:browser
npm run probe:state
npm run verify:release
```

## Was enthalten ist

- 3D-Arena mit dynamischem Drone-Schwarm (`@react-three/fiber`, `@react-three/drei`)
- Vollstaendige Missionssteuerung:
  Start, Pause, Resume, Reset, Difficulty, Grid, Atmosphere, Auto-Rotate, Theme
- Laufende HUD-Metriken fuer State, Wave, Score, Lives und Schalterzustaende
- Error-Boundary und Loading-Fallback fuer robuste WebGL-Startpfade
- Unit- und Browser-Tests, die jeden Hauptbutton aktiv verifizieren
