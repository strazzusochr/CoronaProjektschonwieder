# GODMODE Walkthrough

## Stand: 2026-04-08

Dieses Dokument ist ein knapper High-Level-Überblick über den aktuellen, repo-verifizierten Stand in `d:\Web\docs\godmode_setup`.

Das kanonische Dokument für Guide-vs-Repo-Abgleich, Statuslabels und priorisierte Lücken ist jetzt `STACK_GAP_ROADMAP.md`.
Das kanonische Dokument fuer die detaillierte 00-07-Abnahme- und Kontrollmatrix
ist jetzt `KONTROLLPROTOKOLL_00_07.md`.

## Aktueller Repository-Scope

- Das Repository enthält lokale oder Hugging-Face-orientierte Bausteine für `OpenHands`, `smolagents`, `Aider`, `LangGraph`, `n8n` und eine Pilot-/Autonomy-Schicht.
- `bolt.diy` wird bewusst als externer Hugging-Face-Baustein behandelt und nicht als lokales Mirror-Modul.
- Startup- und Launcher-Artefakte existieren für `master env/startup`, darunter `.godmode_env`, `.godmode_env.example`, `ENV_REFERENCE.md`, `START_GODMODE.sh`, `START_GODMODE.ps1` und `aider_godmode.ps1`.
- `autonomy_guard.py`, `FINAL_PROOF.md`, `GODMODE_GOAL.md` und `memory_vault.md` bilden den Missions- und Audit-Rahmen.

## Verifizierte Punkte

- `hf_pilot_actual/app.py` implementiert die kanonische Pilot-Schleife mit standardisiertem Missions-Payload.
- `langgraph/system.py` stellt eine lokale FastAPI-basierte Orchestrierung mit Planner-, Swarm-, Reviewer- und Meta-Optimizer-Pfad bereit; `START_GODMODE` verifiziert den lokalen Health-Pfad, und `/run` degradiert bei Providerfehlern kontrolliert statt mit `500` zu scheitern.
- `n8n/docker-compose.yml`, `n8n_memory_workflow.json` und `n8n_mission_workflow.json` zeigen die kanonische Automations- und Missionsrichtung.
- Das Frontend-Unterprojekt `CoronaProjektschonwieder/` wurde lokal build-, test- und browserseitig verifiziert; der AI-Browser-Debug bestaetigt aktive Szene, sichtbaren Status und fehlende Browserfehler.

## Dokumentationsgrenzen

- Dieses Dokument beschreibt absichtlich nur den hohen, repo-verifizierten Stand.
- Aussagen ueber Oracle Cloud, Hugging Face Spaces, Account-Zugaenge, Secrets oder live gehostete Systeme werden nicht hier gepflegt, sondern im Statusmodell von `STACK_GAP_ROADMAP.md` als `external`, `partial`, `missing` oder `implemented` eingeordnet.

## Nächster Einstieg

- Fuer den strukturierten Soll-Ist-Abgleich gegen `godmode_stack_guide.html`: `STACK_GAP_ROADMAP.md`
- Fuer die detaillierte horizontale/vertikale Kontrollmatrix ueber alle Phasen:
  `KONTROLLPROTOKOLL_00_07.md`
- Fuer reale Startpfade, Service-Grenzen und Integrationsstand: `STACK_OPERATIONS.md`
- Fuer die sichere ENV-Struktur: `ENV_REFERENCE.md` und `.godmode_env.example`
- Fuer kanonische Quellen und Archivpfade: `PROVENANCE_MATRIX.md`
- Fuer den Missionsvertrag zwischen Pilot, n8n und OpenHands: `MISSION_PAYLOAD_CONTRACT.md`
- Fuer den Status der 12 Superkraefte: `SUPERPOWERS_STATUS.md`
- Fuer Missions- und SHA-Nachweise: `FINAL_PROOF.md`, `GODMODE_GOAL.md`, `memory_vault.md`
