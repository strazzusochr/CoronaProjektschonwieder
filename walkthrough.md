# GODMODE Walkthrough

## Stand: 2026-04-08

Dieses Dokument ist ein knapper High-Level-Überblick über den aktuellen, repo-verifizierten Stand in `d:\Web\docs\godmode_setup`.

Das kanonische Dokument für Guide-vs-Repo-Abgleich, Statuslabels und priorisierte Lücken ist jetzt `STACK_GAP_ROADMAP.md`.

## Aktueller Repository-Scope

- Das Repository enthält lokale oder Hugging-Face-orientierte Bausteine für `OpenHands`, `smolagents`, `Aider`, `LangGraph`, `n8n` und eine Pilot-/Autonomy-Schicht.
- `bolt.diy` wird bewusst als externer Hugging-Face-Baustein behandelt und nicht als lokales Mirror-Modul.
- Startup- und Launcher-Artefakte existieren für `master env/startup`, darunter `.godmode_env`, `.godmode_env.example`, `ENV_REFERENCE.md`, `START_GODMODE.sh`, `START_GODMODE.ps1` und `aider_godmode.ps1`.
- `autonomy_guard.py`, `FINAL_PROOF.md`, `GODMODE_GOAL.md` und `memory_vault.md` bilden den Missions- und Audit-Rahmen.

## Verifizierte Punkte

- `hf_pilot_actual/app.py` implementiert die kanonische Pilot-Schleife mit standardisiertem Missions-Payload.
- `langgraph/system.py` stellt eine lokale FastAPI-basierte Orchestrierung mit Planner-, Swarm-, Reviewer- und Meta-Optimizer-Pfad bereit.
- `n8n/docker-compose.yml`, `n8n_memory_workflow.json` und `n8n_mission_workflow.json` zeigen die kanonische Automations- und Missionsrichtung.
- Das Frontend-Unterprojekt `CoronaProjektschonwieder/` wurde lokal build- und browserseitig verifiziert; fruehere Aussagen ueber einen offenen Build-Blocker sind nicht mehr aktuell.

## Dokumentationsgrenzen

- Dieses Dokument beschreibt absichtlich nur den hohen, repo-verifizierten Stand.
- Aussagen ueber Oracle Cloud, Hugging Face Spaces, Account-Zugaenge, Secrets oder live gehostete Systeme werden nicht hier gepflegt, sondern im Statusmodell von `STACK_GAP_ROADMAP.md` als `external`, `partial`, `missing` oder `implemented` eingeordnet.

## Nächster Einstieg

- Fuer den strukturierten Soll-Ist-Abgleich gegen `godmode_stack_guide.html`: `STACK_GAP_ROADMAP.md`
- Fuer reale Startpfade, Service-Grenzen und Integrationsstand: `STACK_OPERATIONS.md`
- Fuer die sichere ENV-Struktur: `ENV_REFERENCE.md` und `.godmode_env.example`
- Fuer kanonische Quellen und Archivpfade: `PROVENANCE_MATRIX.md`
- Fuer den Missionsvertrag zwischen Pilot, n8n und OpenHands: `MISSION_PAYLOAD_CONTRACT.md`
- Fuer den Status der 12 Superkraefte: `SUPERPOWERS_STATUS.md`
- Fuer Missions- und SHA-Nachweise: `FINAL_PROOF.md`, `GODMODE_GOAL.md`, `memory_vault.md`
