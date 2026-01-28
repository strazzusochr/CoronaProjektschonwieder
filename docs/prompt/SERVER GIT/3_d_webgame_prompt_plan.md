# 3D Webgame Deployment Prompt

## Ziel
Erstellung eines vollständigen Deployment-Plans für ein 3D Webgame mit automatisierter CI/CD, Cloud Run Deployment, Security und Kostenkontrolle.

## Eingabeparameter
- `project_name`: Name des Games / Containers
- `game_engine`: z. B. `Three.js`, `Unity WebGL`
- `backend_language`: `Node.js`, `Go`, `Python`
- `cdn_url`: optional, falls Assets über CDN ausgeliefert werden
- `cloud_run_region`: z. B. `us-central1`
- `gitlab_repo`: URL des GitLab-Repos
- `security_level`: `strict`, `moderate`, `basic` → bestimmt CSP & Header

## Prompt-Template
```text
Erstelle einen vollständigen Deployment-Plan für ein 3D Webgame mit folgenden Parametern:
- Projektname: <project_name>
- Game Engine: <game_engine>
- Backend: <backend_language>
- GitLab Repo: <gitlab_repo>
- Cloud Run Region: <cloud_run_region>
- CDN: <cdn_url>
- Security Level: <security_level>

Output:
1. GitLab CI/CD YAML für Build, Test, Deploy
2. Cloud Run Deployment Skript mit Kostenlimits
3. CSP + HTTP Security Headers Template
4. Branching-Strategie und Merge-Request Workflow
5. Optional: Monitoring & Budget Alert Konfiguration
```

## Ablauf / Logik
1. **Code-Build**
   - Generiere Build-Skripte für den Client (z. B. npm run build für Three.js)
   - Artefakte: `/dist`, `/assets`, `.wasm`, `.js`

2. **CI/CD Pipeline**
   - Generiere GitLab CI YAML
   - Stages: `build -> test -> deploy`
   - Deployment zu Cloud Run mit Limits (`max_instances`, `timeout`)

3. **Security**
   - Generiere CSP Header basierend auf `security_level`
   - Generiere HTTP Security Headers Template
   - Optional: Auth/Token-Schutz für API-Endpunkte

4. **Kostenkontrolle**
   - Setze Cloud Run Limits (max instances, timeout)
   - Erzeuge Monitoring- und Budget-Alert Templates

5. **Merge-Request Workflow**
   - Branching: `main`, `develop`, `feature/<name>`
   - Merge-Request Template & Approval-Regeln

## Automatisierung / Nutzung
- Direkt in ChatGPT als Prompt verwenden, um alle Templates zu generieren
- Oder Skript implementieren, das die Dateien automatisch erstellt
- GitLab API kann genutzt werden, um Branches, MRs und Deployments zu automatisieren

## Best Practices
- Versionskontrolle für Pipeline & Security Templates
- Test-Umgebung (`staging`) vor Production
- CSP/Headers regelmäßig prüfen ([Mozilla Observatory](https://observatory.mozilla.org/))
- Cloud Run Kostenlimits stets aktivieren