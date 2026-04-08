# Corona V4: Wien 3D Simulation

Ein kleiner Vite/React-Prototyp fuer eine interaktive 3D-Szene mit robusterer
Fallback-UI und automatisierter Browser-Pruefung.

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
```

## Was enthalten ist

- 3D-Viewport mit `@react-three/fiber` und `@react-three/drei`
- DOM-basierte Missions- und Statusanzeige neben der Szene
- Fallback fuer Lade- und Rendering-Fehler
- Vitest- und Playwright-Smoke-Tests
