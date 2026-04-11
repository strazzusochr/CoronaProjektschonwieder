# Beginner Dev Playbook (3D Games + Normal Apps)

Stand: 2026-04-11

Dieses Playbook ist fuer Einsteiger geschrieben. Ziel: Du kannst das GODMODE-
System lokal und selfhosted bedienen, 3D-Webgames bauen, normale Apps bauen,
und die richtigen Open-Source-AI-Bausteine auswaehlen.

## 0) Was Dieses System Fuer Dich Macht

- Startet einen lokalen Dev-Stack mit:
  - OpenHands
  - OpenHands-Adapter
  - n8n
  - LangGraph
  - LiteLLM
  - bolt-facade
- Nutzt einen einheitlichen Missionsvertrag:
  - `agent/task/source/repo/ref/status/timestamp`
- Schreibt Evidence (Beweise) nach `.godmode_runtime/evidence/`.

## 1) Schnellstart (15 Minuten)

1. Oeffne ein Terminal im Repo:
   - `d:\Web\docs\godmode_setup`
2. Starte den Stack (Windows):
   - `powershell -ExecutionPolicy Bypass -File .\START_GODMODE.ps1`
3. Warte auf die Health-Ausgaben (`200`).
4. Frontend-Checks:
   - `cd .\CoronaProjektschonwieder`
   - `npm install`
   - `npm test`
   - `npm run build`
   - `npm run test:browser`
5. Zurueck ins Root:
   - `cd ..`
6. Laufzeitbeweise erzeugen:
   - `py -3 verify_bolt_facade.py`
   - `py -3 verify_hf_runtime.py`
   - `py -3 oracle_probe.py`
   - `py -3 verify_superpowers.py`

Wenn alle lokalen Gates gruen sind, bist du beta-ready fuer den Core-Track.
Wenn `verify_superpowers.py` auf `12/12 VERIFIED` steht, ist der lokale
Superpower-Track voll verdrahtet.

## 2) Wie Du Taeglich Arbeitest

1. Ziel in 1 Satz definieren (z. B. "Neues Gegner-Verhalten in 3D Szene").
2. Kleine Aufgabe als Mission formulieren.
3. Code lokal aendern.
4. Unit-Tests laufen lassen.
5. Build laufen lassen.
6. Browser-Smoke laufen lassen.
7. Evidence-Skripte laufen lassen.
8. Doku-Eintrag aktualisieren (nur Fakten, keine Wunschtexte).
9. Committen.
10. Pushen.

## 3) Pfad A: 3D Web Game Bauen

### Schritt-fuer-Schritt

1. Szene-Komponente in `CoronaProjektschonwieder/src` anlegen oder erweitern.
2. Kamera + Licht zuerst stabil machen.
3. Danach Gameplay-Objekte, Kollision, UI-Overlay.
4. Immer nach jeder groesseren Aenderung:
   - `npm test`
   - `npm run build`
   - `npm run test:browser`
5. Wenn 3D-Canvas schwarz ist:
   - Canvas-Size pruefen
   - Kamera-Position pruefen
   - Licht pruefen
   - Console-Fehler pruefen

### Offizielle Primärquellen

- Three.js Docs:
  - https://threejs.org/docs/
- React Three Fiber Intro:
  - https://r3f.docs.pmnd.rs/getting-started/introduction
- MDN WebGL:
  - https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API

## 4) Pfad B: Normale App (UI + API + Workflow)

### Schritt-fuer-Schritt

1. UI-Komponente bauen.
2. API-Endpunkt definieren.
3. Payload strikt am Missionsvertrag halten.
4. n8n-Workflow testen (Webhook + Response).
5. Adapter/Dispatch pruefen.
6. Evidence-Datei kontrollieren.

### Offizielle Primärquellen

- React Lernbereich:
  - https://react.dev/learn
- TypeScript Docs:
  - https://www.typescriptlang.org/docs/
- Vite Guide:
  - https://vite.dev/guide/
- Playwright Intro:
  - https://playwright.dev/docs/intro

## 5) Open-Source AI Richtig Waehlen

### Schnellmatrix

- "Ich will Codefix + Repo-Arbeit":
  - Aider + OpenHands Adapter
- "Ich will Agent-Orchestrierung":
  - LangGraph + n8n
- "Ich will Web/Recherche/Tool-Aufgaben":
  - smolagents
- "Ich will Modell-Routing/Fallback":
  - LiteLLM

### Quellen

- Hugging Face Spaces Overview:
  - https://huggingface.co/docs/hub/en/spaces-overview
- Hugging Face Docker Spaces:
  - https://huggingface.co/docs/hub/en/spaces-sdks-docker
- Docker Compose File Reference:
  - https://docs.docker.com/compose/compose-file/
- n8n Webhook Workflow-Development:
  - https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/workflow-development/

## 6) Wenn Etwas Kaputt Ist (Dummy-Diagnose)

### A) `git` blockiert (`index.lock` / another git process)

1. Laufende git-Prozesse beenden.
2. Pruefen, ob `.git/index.lock` existiert.
3. Wenn vorhanden und kein git mehr laeuft: Lock-Datei entfernen.

### B) n8n Webhook `404 not registered`

1. `START_GODMODE.ps1` erneut ausfuehren.
2. Sicherstellen, dass Mission-Workflow importiert/published wurde.
3. Webhook direkt testen:
   - `POST http://127.0.0.1:5678/webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission`

### C) bolt dispatch rot

1. `py -3 verify_bolt_facade.py`
2. `n8n` und `openhands-adapter` Status in Snapshot pruefen.
3. Externes bolt bleibt erlaubt `BLOCKED`, solange lokaler Fallback+Flow gruen ist.

### D) Oracle rot

- Erwartbar im Beta-Core:
  - Oracle darf `BLOCKED` sein, solange Core-Track `PASS` ist.

## 7) Deployment (Selfhosted Hetzner)

Kanonischer Deploy:

```powershell
.\ops\deploy_hetzner_core.ps1 `
  -HostIp 65.108.253.14 `
  -SshUser root `
  -FqdnRoot 65.108.253.14.nip.io `
  -TlsEmail strazzusochr@gmail.com `
  -SshPassword <local-only> `
  -SshHostKey "ssh-ed25519 255 <fingerprint>"
```

Danach Evidence pruefen:

- `.godmode_runtime/evidence/hetzner_deploy_latest.json`
- Erwartung:
  - `status=PASS`
  - HTTPS auf allen 5 Subdomains `200`
  - Service-Ports extern geschlossen

## 8) Wahrheitssystem (wichtig)

Immer diese Regel:

- Repo- und Runtime-Beweise schlagen jede Wunsch-Doku.
- Wenn etwas nicht beweisbar ist:
  - `PARTIAL`, `BLOCKED` oder `NOT VERIFIED` markieren
  - niemals schoenreden.

## 9) Nächste Lernspur (empfohlen)

1. Ein kleines 3D-Level bauen (Spawn + HUD + Hit-Feedback).
2. Einen n8n-Missionsflow fuer dieses Level anhaengen.
3. Einmal selfhosted deployen.
4. Evidence sammeln und sauber dokumentieren.

Damit lernst du in echter Reihenfolge: Build -> Runtime -> Proof -> Betrieb.
