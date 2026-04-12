# GODMODE Beginner Playbook (Zero To 3D + Apps)

Stand: 2026-04-12  
Zielgruppe: absolute Einsteiger ohne Vorerfahrung

---

## 0) Erstmal Ruhe: Was ist hier gerade passiert?

Du hast jetzt ein komplexes Multi-Tool-System. Das ist normal, dass es sich
am Anfang chaotisch anfühlt.

Die gute Nachricht:

- Das 3D-Projekt ist stabil ersetzt durch **Godmode Arena Lab**.
- Build und Browser-Tests laufen grün.
- Du musst nicht alles gleichzeitig lernen.

Dieses Playbook zeigt dir eine feste Reihenfolge.

---

## 1) Sicherheits-Notfall (bitte als Erstes)

Du hast in der Chat-Historie echte Zugangsdaten gepostet (Passwort/Token).  
Bitte **sofort rotieren**:

1. Hetzner Root-Passwort ändern.
2. Hetzner API-Token neu erzeugen und alten deaktivieren.
3. HF-Token neu erzeugen und alten deaktivieren.
4. Alle neuen Secrets nur lokal in `.godmode_env` halten (nicht committen).

Regel:

- Niemals Tokens/Passwörter in Markdown, Git-Commit, Screenshot oder Chat posten.

---

## 2) Einfache Systemkarte (ohne Fachchinesisch)

Du hast 3 Ebenen:

1. **Dein lokaler Rechner (Entwicklung)**
- Hier schreibst du Code.
- Hier laufen `npm test`, `npm run build`, `npm run test:browser`.

2. **Lokaler GODMODE-Stack (Docker)**
- OpenHands, Adapter, n8n, LangGraph, LiteLLM, bolt-facade.
- Dient als Integrationsschicht und Automation.

3. **Remote/Cloud**
- Hetzner Selfhosted (Core-Deploy).
- Hugging Face Spaces (einige öffentlich, einige privat/blockiert).
- Optional Oracle-Track (aktuell kein Core-Blocker).

Merksatz:

- Lokal entwickeln -> lokal testen -> dann deployen.

---

## 3) Was ist was? (Programm-Landkarte)

### 3D App (Godmode Arena Lab)

- Pfad: `CoronaProjektschonwieder/`
- Zweck: dein eigentlicher 3D-Frontend-Code.
- Wichtigste Dateien:
  - `src/App.tsx` (UI + Buttons + Spielzustand)
  - `src/SceneCanvas.tsx` (Three.js Szene)
  - `tests/app.spec.ts` (Browser-End-to-End)

### OpenHands

- Zweck: Coding-Agent Runtime.
- Lokal: `http://127.0.0.1:3000`

### OpenHands Adapter

- Zweck: Brücke/Dispatch zwischen Mission-Payload und OpenHands.
- Lokal: `http://127.0.0.1:3001`

### bolt-facade

- Zweck: Hybrid-Dispatch (lokal + externer Forward).
- Lokal: `http://127.0.0.1:3901`

### n8n

- Zweck: Workflow-Automation/Webhook-Flow.
- Lokal: `http://127.0.0.1:5678`

### LangGraph

- Zweck: Agent-Orchestrierung / Flow-Logik.
- Lokal: `http://127.0.0.1:8080`

### LiteLLM

- Zweck: Modell-Routing/Fallback.
- Lokal: `http://127.0.0.1:4000`

---

## 4) Account- und Login-Checkliste (damit nichts „mystisch“ ist)

Du brauchst typischerweise:

1. GitHub
- Repo-Zugriff und Push.

2. Hugging Face
- Spaces, ggf. private Zugriffstoken.

3. Hetzner
- Server + API Token.

4. Vercel (wenn Frontend dort deployt wird)
- Build/Hosting.

5. Optional Oracle
- Nur wenn dieser Track später aktiv genutzt wird.

Wichtig:

- Das Repo erstellt nicht „heimlich“ neue Web-Accounts mit Passwort für dich.
- Aber Integrationen erwarten, dass deine eigenen Tokens gesetzt sind.
- Wo liegen lokale Secrets?
  - `d:\Web\docs\godmode_setup\.godmode_env` (lokal, nicht committen)
  - ggf. HF Cache: `%USERPROFILE%\.cache\huggingface\token`

---

## 5) Ein Programm für alles: Control Center

Neu verfügbar:

- `ops/GODMODE_CONTROL_CENTER.ps1`

Start:

```powershell
cd d:\Web\docs\godmode_setup
powershell -ExecutionPolicy Bypass -File .\ops\GODMODE_CONTROL_CENTER.ps1
```

Menü:

1. kompletten lokalen Stack starten  
2. 3D Dev-Server starten  
3. komplette 3D Qualitätstests fahren  
4. Runtime-Verifikation fahren  
5. Status + URLs zeigen

Du kannst auch direkt ohne Menü starten:

```powershell
.\ops\GODMODE_CONTROL_CENTER.ps1 -Action start-stack
.\ops\GODMODE_CONTROL_CENTER.ps1 -Action dev-3d
.\ops\GODMODE_CONTROL_CENTER.ps1 -Action gates-3d
.\ops\GODMODE_CONTROL_CENTER.ps1 -Action verify-runtime
.\ops\GODMODE_CONTROL_CENTER.ps1 -Action status
```

---

## 6) Schritt-für-Schritt: Erstes 3D Web Game bauen

### Schritt A: Projekt starten

1. Terminal öffnen.
2. In Repo wechseln:

```powershell
cd d:\Web\docs\godmode_setup
```

3. Dev-Server starten:

```powershell
.\ops\GODMODE_CONTROL_CENTER.ps1 -Action dev-3d
```

4. Browser öffnen: `http://127.0.0.1:5173`

### Schritt B: Spielgefühl ändern

1. Öffne `CoronaProjektschonwieder/src/SceneCanvas.tsx`.
2. Passe z. B. diese Dinge an:
- Anzahl Gegner (Drone count)
- Bewegungs-Speed (difficultySpeed)
- Lichtfarbe (themeColors)
- Kamera/OrbitControls

3. Speichern -> Browser aktualisiert automatisch.

### Schritt C: UI/Gameplay ändern

1. Öffne `CoronaProjektschonwieder/src/App.tsx`.
2. Passe an:
- Buttons (Pause/Resume/Reset)
- Score/Wave/Lives Logik
- Default-Werte

3. Speichern, im Browser testen.

### Schritt D: Qualität sichern

Im Root:

```powershell
.\ops\GODMODE_CONTROL_CENTER.ps1 -Action gates-3d
```

Das läuft:

- `npm test`
- `npm run build`
- `npm run test:browser`

Nur wenn alles grün ist, committen.

---

## 7) Schritt-für-Schritt: normale App statt 3D

Wenn du statt Game lieber klassische Web-App willst:

1. In `App.tsx` UI-Form/Felder bauen.
2. In Backend/Bridge Mission-Payload anlegen:
- Vertrag: `agent/task/source/repo/ref/status/timestamp`
3. n8n-Webhook anbinden.
4. Browser-Tests schreiben.
5. Gates fahren.

Gleiches Qualitätsprinzip wie beim 3D-Spiel.

---

## 8) Was muss vor Deploy erfüllt sein?

Minimal:

1. `npm test` grün
2. `npm run build` grün
3. `npm run test:browser` grün
4. Keine roten Konsolenfehler
5. Keine kaputten Netzwerk-Calls im Test

Optional Runtime-Beweis:

```powershell
.\ops\GODMODE_CONTROL_CENTER.ps1 -Action verify-runtime
```

---

## 9) Hetzner Deploy (wenn du wirklich live gehen willst)

Kanonischer Befehl:

```powershell
.\ops\deploy_hetzner_core.ps1 `
  -HostIp 65.108.253.14 `
  -SshUser root `
  -FqdnRoot <deine-domain> `
  -TlsEmail strazzusochr@gmail.com
```

Danach prüfen:

- `.godmode_runtime/evidence/hetzner_deploy_latest.json`
- HTTPS Endpunkte erreichbar
- nur 22/80/443 extern offen

---

## 10) Wenn etwas kaputt ist: Anfänger-Diagnose

### Problem: Build rot

1. `npm install` neu
2. `npm run build`
3. Fehlerzeile in Datei springen
4. kleinsten möglichen Fix machen

### Problem: Browser-Test rot

1. `npm run test:browser`
2. Screenshot unter `test-results/` prüfen
3. In Konsole nach JS-Error schauen

### Problem: Port belegt

Wenn `4173` belegt ist, laufenden Preview-Prozess beenden und Test neu.

### Problem: Git blockiert

Wenn `index.lock` Fehler:

1. alle laufenden Git-Prozesse schließen
2. `.git/index.lock` löschen (nur wenn kein Git mehr läuft)

---

## 11) Dein täglicher Minimal-Flow (ohne Stress)

1. `status` im Control Center.
2. `dev-3d` starten.
3. Kleine Änderung machen.
4. `gates-3d` laufen lassen.
5. Commit + Push.
6. Erst dann nächsten Schritt.

So kommst du stabil voran, ohne Chaos.

---

## 12) Primärquellen (offizielle Doku)

- React: https://react.dev/learn
- TypeScript: https://www.typescriptlang.org/docs/
- Vite: https://vite.dev/guide/
- Three.js: https://threejs.org/docs/
- React Three Fiber: https://r3f.docs.pmnd.rs/getting-started/introduction
- Playwright: https://playwright.dev/docs/intro
- Docker Compose: https://docs.docker.com/compose/compose-file/
- n8n Webhook Node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/workflow-development/
- Hugging Face Spaces: https://huggingface.co/docs/hub/en/spaces-overview

---

Wenn du willst, ist der nächste Schritt:  
Wir reduzieren das jetzt noch weiter auf **nur 3 feste Knöpfe** (`Develop`, `Test`, `Deploy`) im Control Center.
