# 🛠️ Contributing Guidance - Corona Control Ultimate

## 🌿 Branching Strategie
Wir nutzen eine vereinfachte **Gitflow** Strategie:

1.  **main**: Enthält den stabilen, produktiven Release-Stand. Direkte Commits verboten.
2.  **develop**: Der Haupt-Integrations-Branch. Hier fließen alle Features zusammen.
3.  **feature/<name>**: Hier findet die Entwicklung statt. Nach Abschluss wird ein PR nach `develop` gestellt.
4.  **fix/<name>**: Für dringende Bugfixes.

## 🚀 Workflow
- Erstelle einen Feature-Branch von `develop`.
- Implementiere deine Änderungen (Kommentare & Doku auf DEUTSCH).
- Erstelle einen Pull Request (PR) nach `develop`.
- Nach Verifikation und Squash-Merge in `develop` wird dieser periodisch in `main` gemerget für das Cloud Run Deployment.

## 🛡️ Security & Quality
- Führe vor jedem PR `npm run build` und `npm run test` aus.
- Achte auf die Einhaltung der CSP-Vorgaben in `server.cjs`.
