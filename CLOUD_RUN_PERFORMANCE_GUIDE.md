# React/Vite/Three.js/Rapier Webgame – Cloud Run Deployment & Performance Guide

## Ziel

Diese Dokumentation beschreibt die vollständige Bereitstellung eines React/Vite/Three.js/Rapier Webgames auf **Google Cloud Run** und die Performanceoptimierung mittels **instanced meshes** und Draw-Call Monitoring.

---

## 1. Cloud Run Deployment

### Voraussetzungen

* Google Cloud Projekt (Project ID)
* GCP CLI installiert und authentifiziert (`gcloud auth login`)
* Containerisierung (Docker)
* Repository (GitHub / GitLab CI/CD)

### 1.1 Container Build

1. **Dockerfile** im Projektverzeichnis (Optimiertes Node-Setup):

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.cjs ./
EXPOSE 8080
CMD ["node", "server.cjs"]
```

2. **Build & Push Container**:

```bash
gcloud builds submit --tag gcr.io/<PROJECT_ID>/corona-control-ultimate:latest
```

### 1.2 Deployment auf Cloud Run

```bash
gcloud run deploy corona-control-ultimate --image gcr.io/<PROJECT_ID>/corona-control-ultimate:latest --platform managed --region europe-west3 --allow-unauthenticated --max-instances 3 --memory 512Mi --cpu 1
```

* `max-instances`: Kostenkontrolle, verhindert unkontrolliertes Hochskalieren.
* `memory/cpu`: Optimiert für 3D Rendering (Three.js).
* `allow-unauthenticated`: Öffentliche Zugänglichkeit.

### 1.3 Monitoring & Budget Alerts

1. **monitoring-alerts.yaml** in Cloud Console importieren (Monitoring -> Alerting).
2. Budgetwarnungen: Im Billing-Bereich (z.B. 5€/10€/50€ Limits setzen).
3. CPU / Memory Warnungen für Container via Cloud Console Dashboard.

**Quelle:** [Google Cloud Run Documentation](https://cloud.google.com/run/docs)

---

## 2. Performanceoptimierung

### 2.1 Instanced Meshes in Three.js

* Repetitive Objekte wie Straßenlaternen, Bäume, Mülltonnen, Bänke.
* Reduziert die Anzahl der Draw Calls massiv von N auf 1.

```typescript
import * as THREE from 'three';
import { InstancedStreetLamps } from './environment/InstancedObjects';

// Implementierungsbeispiel aus InstancedObjects.tsx
const count = positions.length;
const mesh = new THREE.InstancedMesh(geometry, material, count);

positions.forEach((pos, i) => {
  dummy.position.set(...pos.position);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
});
mesh.instanceMatrix.needsUpdate = true;
```

### 2.2 Draw Call Monitoring

* Integriert in den `PerformanceProfiler` und das In-Game HUD.
* Überwacht die Effizienz von Instancing und LOD.

```typescript
// GameCanvas.tsx Integration
const PerformanceMonitor = () => {
    const { gl } = useThree();
    useFrame(() => {
        performanceProfiler.updateDrawCalls(gl.info.render.calls);
    });
    return null;
};
```

* FPS und Draw Calls sind im HUD (Top-Right) sichtbar.
* Identifiziert Rendering-Bottlenecks bei hoher NPC-Dichte.

### 2.3 LOD Integration

* Große Modelle (Stephansdom, Gebäude) nutzen Level-of-Detail (LOD).
* Wechselt zwischen Detailstufen (High/Medium/Low) je nach Entfernung.
* Implementiert in `VienneseBuilding.tsx` und `Stephansdom.tsx` via `@react-three/drei` `Detailed`.

---

## 3. GitLab CI/CD Integration

```yaml
stages:
  - build
  - test
  - deploy

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

deploy:
  stage: deploy
  script:
    - gcloud auth activate-service-account --key-file=$GCP_SA_KEY
    - gcloud builds submit --tag gcr.io/$GCP_PROJECT/webgame:latest .
    - gcloud run deploy webgame --image gcr.io/$GCP_PROJECT/webgame:latest --region $GCP_REGION --allow-unauthenticated
  only:
    - main
```

* Automatisches Build & Deployment auf Cloud Run.
* CI/CD Pipeline kann Build-Artefakte für die Validierung nutzen.

---

## 4. Best Practices

* Instancing nur für repetitive oder Performance-kritische Objekte nutzen.
* LOD für große Szenen/Modelle (> 50k Polys) zwingend kombinieren.
* Performance Monitor (Draw Calls) regelmäßig prüfen, ideal < 200 Calls.
* Budget Alerts aktiv lassen, um Kostenkontrolle zu gewährleisten.
* Staging-Deployments vor Production testen (GCP Revision Tagging).

---

### Quellen & Tools

* [Three.js Instancing Documentation](https://threejs.org/docs/index.html#api/en/objects/InstancedMesh)
* [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
* [React + Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
