# 🛠️ Contributing Guidance - Corona Control Ultimate

## 🌿 Branching Strategie

Wir nutzen eine vereinfachte **Gitflow** Strategie:

1. **main**: Enthält den stabilen, produktiven Release-Stand. Direkte Commits verboten.
2. **develop**: Der Haupt-Integrations-Branch. Hier fließen alle Features zusammen.
3. **feature/{name}**: Hier findet die Entwicklung statt. Nach Abschluss wird ein PR nach `develop` gestellt.
4. **fix/{name}**: Für dringende Bugfixes.

## 🚀 Workflow

- Erstelle einen Feature-Branch von `develop`.
- Implementiere deine Änderungen (Kommentare & Doku auf DEUTSCH).
- Erstelle einen Pull Request (PR) nach `develop`.
- Nach Verifikation und Squash-Merge in `develop` wird dieser periodisch in `main` gemerget für das Cloud Run Deployment.

## 🛡️ Security & Quality

- Führe vor jedem PR `npm run build` und `npm run test` aus.
- Achte auf die Einhaltung der CSP-Vorgaben in `server.cjs`.

## 📐 Level of Detail (LOD)

- Für jedes Modell > 50k Polygone ist die Erstellung von mindestens 3 LOD-Stufen Pflicht.
- Benennungsschema: `/assets/lod/<model_name>/LOD0..3.glb`.
- Distanzgrenzen: LOD1 (~15m), LOD2 (~40m), LOD3 (~80m+).
- Assets dürfen das Budget von 5MB pro GLB-Datei nicht überschreiten (wird via `check_assets.js` geprüft).
