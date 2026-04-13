# GODMODE Ultimatives Anfänger-Handbuch - Glossar

Stand: 2026-04-13

---

## Grundbegriffe

- **Core Runtime**: Die lokal oder selfhosted laufenden Hauptdienste des Systems.
- **Hosted Facade**: Cloud-Oberfläche (z. B. HF Space), die auf Runtime-Logik zeigt.
- **Dispatch**: Weiterleitung einer Mission an einen Ziel-Agenten.
- **Mission Payload**: Das JSON mit 7 Pflichtfeldern für Aufträge.
- **Evidence**: Beweisdatei (JSON/Log/Screenshot) für den tatsächlichen Zustand.

## Verträge

- **7-Feld-Contract**: `agent`, `task`, `source`, `repo`, `ref`, `status`, `timestamp`.
- **No-Lie Rule**: Ohne Beweis keine Hochstufung auf `VERIFIED`.
- **Zero-Compute Policy**: Schwere KI/3D-Last nicht lokal rechnen, sondern remote/selfhosted.

## Komponenten

- **OpenHands**: Agent-Runtime UI/Service.
- **OpenHands Adapter**: Nimmt Missionen an und bridged zur Laufzeit.
- **bolt-facade**: Zentrale Dispatch-Fassade mit Routing/Fallback.
- **LangGraph**: Orchestrierungsdienst.
- **smolagents**: Agenten-Set für Tool-/Research-Workflows.
- **n8n**: Workflow- und Webhook-Automation.
- **LiteLLM**: Modellrouter für LLM-Aufrufe.

## Betriebswege

- **Windows lokal**: Entwicklungsmodus auf dem lokalen Rechner.
- **Linux/selfhosted**: Runtime auf Linux-Host oder VM.
- **Hetzner Deploy**: Automatisierter Selfhosted-Rollout via `deploy_hetzner_core.ps1`.
- **HF Integration**: Nutzung/Prüfung von Hugging Face Spaces.

## Statusklassen

- **VERIFIED**: Live geprüft.
- **PARTIAL**: Teilweise geprüft.
- **BLOCKED**: Extern blockiert (Auth/Infra).
- **LEGACY**: Historisch, nicht Hauptpfad.
- **PLAN**: Zielbild ohne Live-Beweis.
- **UNKNOWN**: Unklare Faktenlage.
- **NOT VERIFIED**: Noch kein Nachweis.

## Qualität und Freigabe

- **Gate**: Pflichtprüfung (z. B. Test, Build, Browser, Routing).
- **PASS/FAIL**: Ergebnis eines Gates.
- **Release Snapshot**: Tag/JSON, um vor großen Änderungen rollbackfähig zu bleiben.
- **Rollback**: Rückkehr auf vorherigen Snapshot.

