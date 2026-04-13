# GODMODE Platform Prompt Library

Diese Bibliothek ist für die All-in-One-Entwicklerplattform gedacht.
Alle Missionen werden über den 7-Feld-Vertrag gesendet:

`agent, task, source, repo, ref, status, timestamp`

## 1) App-MVP Prompt

**Empfohlener Agent:** `local.langgraph.planner`

```text
Build a production-ready web app MVP with auth, dashboard, CRUD API, tests, build artifacts, and deployment checklist. Include full QA and evidence output.
```

## 2) 3D Web Game Prompt

**Empfohlener Agent:** `external.ollamahf.lead_coder`

```text
Create a browser-based 3D web game with scene setup, camera controls, gameplay loop, HUD, input mapping, test coverage, and final playable build proof.
```

## 3) Automation Prompt (n8n + Memory)

**Empfohlener Agent:** `local.openhands.openhands`

```text
Design and implement an n8n-driven multi-agent automation flow: mission intake, memory write, dispatch chaining, retry logic, and runtime health checks.
```

## 4) Debug + Hardening Prompt

**Empfohlener Agent:** `local.langgraph.reviewer`

```text
Run deep diagnostics, identify root-cause bugs, patch reliability gaps, harden startup and runtime checks, and deliver verified pass/fail evidence summary.
```

## Nutzung

1. Platform Homepage öffnen.
2. Prompt im Bereich `Prompt Builder (Apps + 3D + Automation)` auswählen.
3. `Use template for dispatch` klicken.
4. Payload prüfen und `Send mission dispatch` ausführen.
