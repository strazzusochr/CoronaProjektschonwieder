# Branching-Strategie & Merge-Request Workflow
## Corona Control Ultimate - Server Git Plan

### 1. Branching-Modell (Gitflow-lite)

Wir verwenden ein vereinfachtes Gitflow-Modell, um Stabilität und schnelle Iteration zu gewährleisten.

#### Haupt-Branches
- **`main`**: 
  - Enthält den **Production-Ready Code**.
  - Deployment: Löst automatisch Deployment zu **Cloud Run (Production)** aus.
  - Schutz: **Protected Branch**. Kein direkter Push erlaubt. Nur via Merge Request.
- **`develop`**: 
  - Der Integrations-Branch für alle neuen Features.
  - Deployment: Löst Deployment zur **Staging/Dev Umgebung** aus.
  - Schutz: **Protected Branch**. Push nur nach erfolgreichem CI-Build.

#### Temporäre Branches
- **`feature/<name>`**:
  - Für neue Features oder Umbauten.
  - Basis: `develop`
  - Merge-Ziel: `develop`
  - Namenskonvention: `feature/auth-system`, `feature/inventory-ui`
- **`bugfix/<name>`**:
  - Für Fehlerbehebungen im Development.
  - Basis: `develop`
  - Merge-Ziel: `develop`
- **`hotfix/<name>`**:
  - Für kritische Fehler in Production.
  - Basis: `main`
  - Merge-Ziel: `main` UND `develop`

### 2. Merge-Request (MR) Workflow

Jede Änderung muss via Merge Request in `develop` oder `main` eingebracht werden.

#### Workflow-Schritte
1. Erstelle Feature-Branch (`git checkout -b feature/mein-feature develop`)
2. Implementiere Änderungen & Committe (`git commit -m "feat: add new hud component"`)
3. Pushe Branch (`git push -u origin feature/mein-feature`)
4. Erstelle Merge Request (MR) in GitLab:
   - **Titel**: Aussagekräftig (z.B. "Implementiert HUD V2")
   - **Beschreibung**: Nutze das MR-Template (siehe unten)
   - **Reviewer**: Mindestens 1 Reviewer (optional für Phase 1)
   - **CI Pipeline**: Muss grün sein (`build` & `test` erfolgreich)

#### MR-Template (`.gitlab/merge_request_templates/Default.md`)

```markdown
## Beschreibung
[Beschreibe kurz, was dieser MR ändert/hinzufügt]

## Typ der Änderung
- [ ] New Feature
- [ ] Bugfix
- [ ] Refactoring
- [ ] Documentation

## Checklist
- [ ] Build läuft lokal (`npm run build`)
- [ ] Tests laufen lokal (`npm run test`)
- [ ] Linter Check (`npm run lint`)
- [ ] Keine Secrets im Code
```

### 3. Approval-Regeln (Optional für Phase 1)
- `main`: Benötigt 1 Approval von Maintainer.
- `develop`: Kann ohne Approval gemerged werden, wenn Pipeline grün.

### 4. Versionierung
Wir nutzen Semantic Versioning (SemVer) via Git Tags auf `main`.
- `v1.0.0`: Major Release
- `v1.1.0`: Minor Release (Features)
- `v1.1.1`: Patch Release (Bugfixes)

Release-Prozess:
1. Merge `develop` nach `main`
2. Erstelle Tag: `git tag -a v1.1.0 -m "Release v1.1.0"`
3. Push Tag: `git push origin v1.1.0`
-> CI Pipeline baut und deployed Production Version.
