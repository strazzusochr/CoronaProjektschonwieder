# GODMODE Kontrollprotokoll 00-07

Stand: 2026-04-09

Dieses Dokument ist das kanonische Abnahme- und Steuerprotokoll fuer den
GODMODE-Stack in `d:\Web\docs\godmode_setup`.

Provider-neutral migration note:
- Oracle is no longer an active required host in the canonical runtime model.
- Remaining Oracle references in this protocol are historical audit evidence
  or future-profile placeholders unless a line explicitly says otherwise.

Es kombiniert vier Sichten in einer Datei:

- horizontal: Phasen `00` bis `07` gegen Stack-Domaenen und Missionsartefakte
- vertikal: je Phase Zielbild, Schritte, Evidenz, Risiken und Exit-Gate
- vertikal-horizontal gespiegelt: je Domaene alle zugehoerigen Phasen und
  Schritt-IDs
- Overlay fuer die 12 Superpowers

## Legende

- Statusvokabular: `implemented`, `partial`, `missing`, `external`
- Schritt-IDs sind stabil und phasenbasiert: `00.1`, `03.2`, `07.4`
- Jeder Kontrollpunkt braucht genau eine Repo-Evidenz oder einen expliziten
  `external`-Vermerk.
- Archivpfade wie `hf_langgraph`, `hf_pilot_clone` und `corona_test` duerfen
  nur als Historienhinweis gelesen werden, nicht als aktive Wahrheitsquelle.

## Hosted Sync 2026-04-09

- `Wrzzzrzr/openhands-godmode`: aus `hf_openhands/` neu ausgerollt; Wrapper-
  Fixes fuer LF/CMD-Bootstrap sind live, Space-URL antwortete mit HTTP `200`.
- `Wrzzzrzr/langgraph-godmode`: weiterhin `RUNNING`; `/health` antwortete mit
  HTTP `200`.
- `Wrzzzrzr/smolagents-godmode`: neu erstellt und aus `hf_smolagents/`
  ausgerollt; Space-URL antwortete mit HTTP `200`.
- `Wrzzzrzr/aider-godmode-safe`: neue kanonische Hosted-Aider-Oberflaeche; die
  URL antwortete mit HTTP `200`.
- `Wrzzzrzr/aider-web-ide`: historischer Alt-Space bleibt wegen eines frueheren
  HF-Abuse-Flags pausiert und ist nicht mehr kanonisch.
- `Wrzzzrzr/godmode-pilot`: private Hosted-Pilotinstanz ist ueber die
  authentisierte HF-API als `RUNNING` belegt; ein authentisierter `/health`-
  Abruf lieferte HTTP `200`.
- Future Oracle profile: SSH zum in `.godmode_env` reservierten Host lief am
  2026-04-09 in einen Timeout. Deshalb bleiben Oracle-bezogene Hinweise hier
  historische bzw. zukunftsprofilbezogene Evidenz, obwohl die Repo-seitigen
  Start- und Env-Vertraege vorbereitet sind.

## Horizontale Kontrollmatrix

Lesart:

- von links nach rechts: Phasenfortschritt kontrollieren
- von oben nach unten: Domaenenabdeckung validieren

| Kontrollbereich | Phase 00 | Phase 01 | Phase 02 | Phase 03 | Phase 04 | Phase 05 | Phase 06 | Phase 07 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Architektur & Voraussetzungen / master env/startup | `implemented`; `00.1`, `00.2`, `00.3`; `.godmode_env.example`, `ENV_REFERENCE.md`, `PROVENANCE_MATRIX.md` | `partial`; `01.1`; `openhands/docker-compose.yml` | `external`; `02.1`, `02.2`; `BOLTDIY_EXTERNAL_INTEGRATION.md` | `partial`; `03.3`; `hf_smolagents/README.md` | `partial`; `04.1`; `aider_godmode.ps1` | `partial`; `05.1`; `langgraph/docker-compose.yml` | `partial`; `06.1`; `n8n/docker-compose.yml` | `implemented`; `07.1`; `START_GODMODE.ps1`, `START_GODMODE.sh` |
| OpenHands - Das Gehirn des Systems | `partial`; `00.3`; `STACK_GAP_ROADMAP.md` | `partial`; `01.1`, `01.2`, `01.3`, `01.4`; `openhands/adapter.py`, `hf_openhands/README.md` | `external`; `02.3`; `BOLTDIY_EXTERNAL_INTEGRATION.md` | `missing`; `03.4`; no direct repo proof | `missing`; `04.3`; no direct repo proof | `partial`; `05.3`; `MISSION_PAYLOAD_CONTRACT.md` | `partial`; `06.4`; `n8n_mission_workflow.json` | `partial`; `07.2`; `hf_pilot_actual/app.py` |
| bolt.diy - Die Web IDE im Browser | `external`; `00.3`; `STACK_GAP_ROADMAP.md` | `external`; `01.4`; `BOLTDIY_EXTERNAL_INTEGRATION.md` | `external`; `02.1`, `02.2`, `02.3`; `BOLTDIY_EXTERNAL_INTEGRATION.md` | `external`; `03.4`; no local runtime | `external`; `04.3`; no local runtime | `external`; `05.3`; no local runtime | `external`; `06.4`; no local runtime | `partial`; `07.2`; operator contract only in `BOLTDIY_EXTERNAL_INTEGRATION.md` |
| smolagents - HuggingFace Native Agents | `partial`; `00.2`; `PROVENANCE_MATRIX.md` | `missing`; `01.4`; no direct repo proof | `external`; `02.3`; no local bolt.diy bridge | `implemented`; `03.1`, `03.2`, `03.3`, `03.4`; `hf_smolagents/app.py`, `hf_smolagents/README.md` | `missing`; `04.3`; no direct repo proof | `partial`; `05.3`; no verified live LangGraph bridge | `missing`; `06.4`; no direct repo proof | `partial`; `07.2`; integration intent only |
| Aider - Der Git-Native Code Wizard | `partial`; `00.1`; `ENV_REFERENCE.md` | `missing`; `01.4`; no direct repo proof | `external`; `02.3`; external UI route only | `missing`; `03.4`; no direct repo proof | `implemented`; `04.1`, `04.2`, `04.3`; `aider_godmode.ps1`, `hf_aider/README.md` | `partial`; `05.3`; orchestration intent only | `partial`; `06.4`; pilot-trigger path only | `partial`; `07.2`; `hf_pilot_actual/app.py` |
| LangGraph - Der 8-Agent Orchestrator | `partial`; `00.2`; `PROVENANCE_MATRIX.md` | `missing`; `01.4`; no direct OpenHands runtime proof | `external`; `02.3`; no local bolt.diy runtime | `partial`; `03.4`; only intended bridge | `partial`; `04.3`; Aider path not runtime-proven | `partial`; `05.1`, `05.2`, `05.3`, `05.4`; `langgraph/system.py`, `hf_langgraph_space/app.py` | `partial`; `06.4`; mission path exists by contract | `partial`; `07.2`; no full live end-to-end proof |
| n8n - Die Automation Engine | `partial`; `00.3`; `ENV_REFERENCE.md` | `missing`; `01.4`; no direct repo proof | `external`; `02.3`; no local bolt.diy runtime | `missing`; `03.4`; no direct repo proof | `partial`; `04.3`; pilot and Aider intent only | `partial`; `05.3`; payload alignment only | `partial`; `06.1`, `06.2`, `06.3`, `06.4`; `n8n/docker-compose.yml`, `n8n_memory_workflow.json`, `n8n_mission_workflow.json` | `partial`; `07.2`; operator import remains external |
| Stack Integration / pilot-autonomy | `implemented`; `00.4`; `MISSION_PAYLOAD_CONTRACT.md`, `PROVENANCE_MATRIX.md` | `partial`; `01.4`; `openhands/adapter.py` | `external`; `02.3`; `BOLTDIY_EXTERNAL_INTEGRATION.md` | `partial`; `03.4`; `hf_smolagents/app.py` | `partial`; `04.3`; `hf_pilot_actual/app.py` | `partial`; `05.3`; `langgraph/system.py` | `partial`; `06.4`; `n8n_mission_workflow.json` | `partial`; `07.1`, `07.2`, `07.4`; `hf_pilot_actual/app.py`, `autonomy_guard.py`, `GODMODE_GOAL.md` |
| proof / frontend verification | `implemented`; `00.4`; `FINAL_PROOF.md`, `memory_vault.md` | `missing`; `01.4`; no domain-specific proof | `external`; `02.3`; no local browser proof for bolt.diy | `partial`; `03.2`; `VisualDebugTool` in `hf_smolagents/app.py` | `missing`; `04.3`; no direct browser proof | `partial`; `05.2`; review path exists in `langgraph/system.py` | `partial`; `06.3`; memory proof path exists | `implemented`; `07.3`, `07.4`; `FINAL_PROOF.md`, `CoronaProjektschonwieder/` |
| ULTIMATE SUPERKRAEFTE / 12 superpowers | `implemented`; `00.3`; `litellm_config.yaml`, `ENV_REFERENCE.md` | `partial`; `01.2`; `SUPERPOWERS_STATUS.md` | `partial`; `02.2`, `02.3`; `BOLTDIY_EXTERNAL_INTEGRATION.md` | `implemented`; `03.1`, `03.2`; `hf_smolagents/app.py` | `implemented`; `04.1`, `04.2`; `aider_godmode.ps1` | `implemented`; `05.2`; `langgraph/system.py` | `partial`; `06.2`, `06.3`; `n8n_*_workflow.json` | `partial`; `07.2`, `07.4`; `SUPERPOWERS_STATUS.md`, `autonomy_guard.py` |

## Vertikale Phasenansicht

### Phase 00 - Architektur, Provenance, Secret-Haertung

- Zielbild: Control-plane, aktive Quellen, Secret-Vertrag und Repo-Grenzen sind
  sauber definiert.
- Eingaenge/Voraussetzungen: `STACK_GAP_ROADMAP.md`, `PROVENANCE_MATRIX.md`,
  `ENV_REFERENCE.md`, `.godmode_env.example`
- Kontrollpunkte:
  - `00.1`: gemeinsamer ENV- und Launcher-Vertrag ist dokumentiert
  - `00.2`: kanonische vs. archivierte Pfade sind eindeutig markiert
  - `00.3`: externe Secrets, HF-Services und Hosted-Abhaengigkeiten sind als
    `external` oder `partial` kenntlich
  - `00.4`: Missions- und Proof-Artefakte sind als Control-plane-Quellen
    verankert
- Schritte:
  - `00.1`: `master env/startup` auf `.godmode_env.example`,
    `ENV_REFERENCE.md`, `START_GODMODE.ps1` und `START_GODMODE.sh` abgleichen
  - `00.2`: aktive Pfade gegen `PROVENANCE_MATRIX.md` validieren
  - `00.3`: Hosted- und Token-Grenzen gegen `STACK_GAP_ROADMAP.md` markieren
  - `00.4`: Mission/Proof gegen `MISSION_PAYLOAD_CONTRACT.md`,
    `FINAL_PROOF.md`, `GODMODE_GOAL.md` und `memory_vault.md` verknuepfen
- Erwartete Artefakte: saubere Root-Doku, stabile Pfadrollen, klare
  `external`-Markierungen
- Repo-Evidenz: `.godmode_env.example`, `ENV_REFERENCE.md`,
  `PROVENANCE_MATRIX.md`, `MISSION_PAYLOAD_CONTRACT.md`, `FINAL_PROOF.md`
- Externe Abhaengigkeiten: reale Tokens, HF-Settings, Oracle-Hostzugriff
- Abweichungen/Risiken: lokale Secrets und Hosted-Zustaende sind nicht allein
  aus dem Repo beweisbar
- Exit-Gate: aktive Wahrheitsquellen sind dokumentiert und alle nicht-beweisbaren
  Infrastrukturthemen sind explizit als `external` oder `partial` markiert

### Phase 01 - OpenHands

- Zielbild: OpenHands ist als lokaler Runtime-Pfad plus HF-Wrapper mit klarer
  Trigger- und Operatorgrenze dokumentiert.
- Eingaenge/Voraussetzungen: `openhands/docker-compose.yml`,
  `openhands/adapter.py`, `hf_openhands/README.md`, `STACK_OPERATIONS.md`
- Kontrollpunkte:
  - `01.1`: lokale Runtime ist benennbar und startpfadklar
  - `01.2`: Adapter-Trigger und Payload-Annahme sind dokumentiert
  - `01.3`: HF-Wrapper ist vom lokalen Runtime-Pfad getrennt beschrieben
  - `01.4`: Integrationsgrenzen zu Pilot, n8n und Aider sind offen oder
    explizit markiert
- Schritte:
  - `01.1`: Compose-Runtime und Portverhalten aus
    `openhands/docker-compose.yml` validieren
  - `01.2`: Adapterrolle aus `openhands/adapter.py` gegen
    `MISSION_PAYLOAD_CONTRACT.md` pruefen
  - `01.3`: HF-Wrapper und Operatorhinweise gegen `hf_openhands/README.md`
    spiegeln
  - `01.4`: offene Bruecken zu Pilot, n8n, Aider und bolt.diy in der
    Integrationssicht markieren
- Erwartete Artefakte: klarer OpenHands-Laufweg, Adaptervertrag, keine
  Verwechslung zwischen lokalem Runtime-Pfad und HF-Wrapper
- Repo-Evidenz: `openhands/docker-compose.yml`, `openhands/adapter.py`,
  `hf_openhands/README.md`
- Externe Abhaengigkeiten: hosted OpenHands, HF-Space-Settings, reale Remote-
  Trigger
- Abweichungen/Risiken: echte Multi-Agent- und Live-Trigger-Proofs bleiben
  teilweise ausserhalb des Repos
- Exit-Gate: OpenHands ist als `partial` oder besser begruendet und jede offene
  Bridge ist sauber benannt

### Phase 02 - bolt.diy

- Zielbild: bolt.diy ist bewusst als externer HF-Baustein kontrolliert, nicht
  als lokales Scheinmodul.
- Eingaenge/Voraussetzungen: `BOLTDIY_EXTERNAL_INTEGRATION.md`,
  `STACK_GAP_ROADMAP.md`, `.godmode_env.example`
- Kontrollpunkte:
  - `02.1`: external-only Position ist explizit
  - `02.2`: Secret-, LiteLLM- und Operatorvertrag sind dokumentiert
  - `02.3`: Rueckkanal zu Pilot, OpenHands und n8n ist benannt, auch wenn er
    nicht voll lokal bewiesen ist
- Schritte:
  - `02.1`: bolt.diy ueberall als `external` statt als `missing local module`
    fuehren
  - `02.2`: HF/LiteLLM/CORS/Secret-Grenzen aus
    `BOLTDIY_EXTERNAL_INTEGRATION.md` einordnen
  - `02.3`: Feedback-Loop zu `MISSION_PAYLOAD_CONTRACT.md`, Pilot und n8n
    zuordnen
- Erwartete Artefakte: externer Operatorvertrag, keine irrefuehrende lokale
  Implementationsbehauptung
- Repo-Evidenz: `BOLTDIY_EXTERNAL_INTEGRATION.md`, `STACK_GAP_ROADMAP.md`
- Externe Abhaengigkeiten: Hugging Face Space, CORS, Hosted-Secrets, Live-UI
- Abweichungen/Risiken: Browser-IDE und Live-Feedback sind nicht repo-intern
  pruefbar
- Exit-Gate: bolt.diy ist durchgaengig als `external` gefuehrt und an reale
  Integrationspunkte angebunden

### Phase 03 - smolagents

- Zielbild: smolagents ist als kanonischer Agentenpfad mit Web-, Vision- und
  Manager-Faehigkeiten abnahmefaehig beschrieben.
- Eingaenge/Voraussetzungen: `hf_smolagents/app.py`, `hf_smolagents/README.md`,
  `SUPERPOWERS_STATUS.md`
- Kontrollpunkte:
  - `03.1`: Agenten, Tools und Rollen sind aus dem Code ableitbar
  - `03.2`: Browser-, Vision- und WebResearch-Faehigkeiten sind dokumentiert
  - `03.3`: lokale/hosted Startweise ist klar getrennt
  - `03.4`: offene Integrationen zu LangGraph, OpenHands und bolt.diy sind
    sauber markiert
- Schritte:
  - `03.1`: Agenten- und Toolbestand in `hf_smolagents/app.py` zuordnen
  - `03.2`: Vision- und WebResearch-Faehigkeiten mit den Superpowers abgleichen
  - `03.3`: README und ENV-Hinweise gegen den Root-Vertrag spiegeln
  - `03.4`: Integrationsluecken im Kontrollprotokoll als `partial` oder
    `external` markieren
- Erwartete Artefakte: nachvollziehbare Agentenbeschreibung, klares Capability-
  Mapping, keine ueberzogenen Hosted-Behauptungen
- Repo-Evidenz: `hf_smolagents/app.py`, `hf_smolagents/README.md`,
  `SUPERPOWERS_STATUS.md`
- Externe Abhaengigkeiten: HF-Space-Livebetrieb, Browserrechte, Hosted-Secrets
- Abweichungen/Risiken: Guide-Versprechen zu Deep Browser Access sind nur
  teilweise repo-belegt
- Exit-Gate: smolagents ist mindestens als `implemented` fuer den lokalen
  Codebestand und als `partial` fuer externe Bruecken sauber eingestuft

### Phase 04 - Aider

- Zielbild: Aider hat einen klaren Launcher-, Modell- und Repo-Map-Vertrag und
  ist in die Pilot-Sicht eingeordnet.
- Eingaenge/Voraussetzungen: `aider_godmode.ps1`, `hf_aider/README.md`,
  `hf_pilot_actual/app.py`
- Kontrollpunkte:
  - `04.1`: Launcher und ENV-Ladepfad sind sauber beschrieben
  - `04.2`: Ultracheap- und Repo-Map-Defaults sind belegt
  - `04.3`: Ausloesung durch Pilot und offene Cloud-Abhaengigkeiten sind klar
- Schritte:
  - `04.1`: `aider_godmode.ps1` gegen `ENV_REFERENCE.md` validieren
  - `04.2`: Repo-Map- und Modellpfad gegen `SUPERPOWERS_STATUS.md` spiegeln
  - `04.3`: Pilot- und Remote-Verweise aus `hf_pilot_actual/app.py` und
    `hf_aider/README.md` kontrollieren
- Erwartete Artefakte: Aider als kanonischer Launcher-Pfad, keine unklare
  Modell- oder Repo-Map-Erzaehlung
- Repo-Evidenz: `aider_godmode.ps1`, `hf_aider/README.md`,
  `hf_pilot_actual/app.py`
- Externe Abhaengigkeiten: echte Modellanbieter, HF-Space- oder Oracle-Hosts
- Abweichungen/Risiken: lokale Aider-Nutzung ist besser belegt als der komplette
  Cloud-Betrieb
- Exit-Gate: Aider ist fuer Launcher/Defaults `implemented` und fuer hosted
  Integration klar als `partial` begrenzt

### Phase 05 - LangGraph

- Zielbild: LangGraph ist als lokaler Orchestrator plus HF-Facade beschrieben,
  inklusive ehrlicher Abweichung vom Guide-Zielbild.
- Eingaenge/Voraussetzungen: `langgraph/system.py`,
  `langgraph/docker-compose.yml`, `hf_langgraph_space/app.py`,
  `SUPERPOWERS_STATUS.md`
- Kontrollpunkte:
  - `05.1`: lokale API und Compose-Runtime sind benennbar
  - `05.2`: Planner-, Swarm-, Reviewer- und Meta-Optimizer-Pfade sind als
    Funktionen identifizierbar
  - `05.3`: HF-Facade und lokale Runtime sind sauber getrennt
  - `05.4`: Guide-Anspruch "8-Agent Orchestrator" ist als aktuelle Luecke
    kontrolliert
- Schritte:
  - `05.1`: lokalen Laufpfad gegen `langgraph/system.py` und
    `langgraph/docker-compose.yml` pruefen
  - `05.2`: Orchestrierungs- und Prompt-Evolution-Pfade gegen
    `SUPERPOWERS_STATUS.md` spiegeln
  - `05.3`: HF-Facade gegen `hf_langgraph_space/app.py` und die lokale Runtime
    abgleichen
  - `05.4`: Soll-Ist-Luecke gegen `STACK_GAP_ROADMAP.md` explizit festhalten
- Erwartete Artefakte: ehrlicher LangGraph-Status, klare lokale API-Sicht,
  keine uebertriebenen 8-Agent-Behauptungen
- Repo-Evidenz: `langgraph/system.py`, `langgraph/docker-compose.yml`,
  `hf_langgraph_space/app.py`, `STACK_GAP_ROADMAP.md`
- Externe Abhaengigkeiten: Hosted-Facade, Modell-Provider, Live-Cluster- oder
  Space-Settings
- Abweichungen/Risiken: der Guide ist ambitionierter als der heute repo-
  belegte Orchestrator; Live-Provider koennen extern fehlschlagen, muessen dann
  aber kontrolliert degradieren statt den lokalen API-Pfad zu brechen
- Exit-Gate: lokale Runtime, `/health` und `/run` sind nachvollziehbar, die
  Hosted-Facade bleibt getrennt sichtbar, und der 8-Agent-Gap ist sauber als
  `partial` dokumentiert

### Phase 06 - n8n

- Zielbild: n8n ist als env-sicherer Workflow-Pfad fuer Mission Intake und
  Memory-Ablage dokumentiert.
- Eingaenge/Voraussetzungen: `n8n/docker-compose.yml`,
  `n8n_mission_workflow.json`, `n8n_memory_workflow.json`,
  `MISSION_PAYLOAD_CONTRACT.md`
- Kontrollpunkte:
  - `06.1`: Compose- und ENV-Vertrag sind erkennbar
  - `06.2`: Mission-Workflow nimmt den kanonischen Payload auf
  - `06.3`: Memory-Workflow weist auf `memory_vault.md` oder den definierten
    Pfad
  - `06.4`: Bruecke zu Pilot, OpenHands und LangGraph ist als Vertrag
    nachvollziehbar
- Schritte:
  - `06.1`: `n8n/docker-compose.yml` gegen `ENV_REFERENCE.md` validieren
  - `06.2`: `n8n_mission_workflow.json` gegen
    `MISSION_PAYLOAD_CONTRACT.md` pruefen
  - `06.3`: `n8n_memory_workflow.json` gegen `memory_vault.md` und
    `MEMORY_VAULT_PATH` kontrollieren
  - `06.4`: Pilot- und Adapter-Verweise aus `hf_pilot_actual/app.py` und
    `STACK_OPERATIONS.md` abgleichen
- Erwartete Artefakte: eindeutiger Workflow-Zweck, Mission- und Memory-Bezug,
  keine verschleierte Hosted-Annahme
- Repo-Evidenz: `n8n/docker-compose.yml`, `n8n_mission_workflow.json`,
  `n8n_memory_workflow.json`, `MISSION_PAYLOAD_CONTRACT.md`
- Externe Abhaengigkeiten: importierte Live-Workflows, n8n-UI, Credentials
- Abweichungen/Risiken: die Repo-Artefakte belegen die Richtung, aber nicht den
  bereits laufenden produktiven Workflow
- Exit-Gate: Mission- und Memory-Pfad sind repo-seitig nachvollziehbar und
  externe Operatorarbeit ist klar markiert

### Phase 07 - Stack-Integration und Mission Loop

- Zielbild: Missionseingang, Dispatch, Kontrolle, Frontend-Verifikation und
  Proof sind als zusammenhaengender Loop dokumentiert.
- Eingaenge/Voraussetzungen: `START_GODMODE.ps1`, `START_GODMODE.sh`,
  `MISSION_PAYLOAD_CONTRACT.md`, `hf_pilot_actual/app.py`,
  `autonomy_guard.py`, `FINAL_PROOF.md`, `CoronaProjektschonwieder/`
- Kontrollpunkte:
  - `07.1`: Startup-Skripte und Payload-Vertrag sind gemeinsam lesbar
  - `07.2`: Mission Loop Pilot -> n8n/OpenHands -> Folgearbeit ist als
    Vertragskette benannt
  - `07.3`: Frontend-, Browser- und Proof-Verifikation sind als eigener
    Kontrollpunkt gefasst
  - `07.4`: DONE-/Proof-Gate ueber `autonomy_guard.py`, `GODMODE_GOAL.md` und
    `FINAL_PROOF.md` ist klar beschrieben
- Schritte:
  - `07.1`: `START_GODMODE.ps1`, `START_GODMODE.sh` und
    `MISSION_PAYLOAD_CONTRACT.md` in eine gemeinsame Integrationssicht bringen
  - `07.2`: Dispatch-Pfade in `hf_pilot_actual/app.py` gegen OpenHands-, n8n-
    und bolt.diy-Vertrag abgleichen
  - `07.3`: `CoronaProjektschonwieder/`, `FINAL_PROOF.md` und Browser-/Build-
    Nachweise als Verifikationsstrecke referenzieren
  - `07.4`: Missionsabschluss ueber `autonomy_guard.py`, `GODMODE_GOAL.md` und
    `memory_vault.md` kontrollieren
- Erwartete Artefakte: eine lesbare Missionskette von Ziel bis Proof, klare
  Exit-Regel fuer DONE
- Repo-Evidenz: `START_GODMODE.ps1`, `START_GODMODE.sh`,
  `MISSION_PAYLOAD_CONTRACT.md`, `hf_pilot_actual/app.py`,
  `autonomy_guard.py`, `FINAL_PROOF.md`
- Externe Abhaengigkeiten: live Webhooks, HF-Runtimes, Remote-Agents,
  Produktions-Deploys
- Abweichungen/Risiken: die Integrationsintention ist gut belegt, aber nicht
  jede externe Strecke ist im Repo live reproduzierbar; lokal belegbar sind
  jedoch Startup, Service-Health, Adapter-Annahme sowie Frontend- und
  Browser-Verifikation
- Exit-Gate: eine vollstaendige Missionskette ist dokumentiert, jede offene
  Hosted-Luecke ist markiert, und Proof/DONE bleiben die finalen Freigabepunkte

## Vertikale Domaenen-Gegenansicht

### Architektur & Voraussetzungen / master env/startup

- Phasenbezug: `00`, `07`
- Relevante Schritte: `00.1`, `00.2`, `00.3`, `00.4`, `07.1`
- Heutiger Ist-Stand: geteilter ENV- und Startup-Rahmen ist repo-seitig
  vorhanden und fuer Root, Services und Launcher beschreibbar
- Offene Luecken: reale Token, Oracle-Host, HF-Secrets und komplette
  Portabilitaet bleiben `external`
- Kanonische Quelle: `.godmode_env.example`, `ENV_REFERENCE.md`,
  `START_GODMODE.ps1`, `START_GODMODE.sh`, `PROVENANCE_MATRIX.md`

### OpenHands - Das Gehirn des Systems

- Phasenbezug: `01`, `06`, `07`
- Relevante Schritte: `01.1`, `01.2`, `01.3`, `01.4`, `06.4`, `07.2`
- Heutiger Ist-Stand: lokaler Compose-Pfad, Adapter und HF-Wrapper sind
  belegbar; der Live-Betrieb bleibt `partial`
- Offene Luecken: vollstaendiger hosted Trigger-Proof, tiefer Multi-Agent-
  Nachweis, eng gekoppelter Pilot-Runtime-Beweis
- Kanonische Quelle: `openhands/docker-compose.yml`, `openhands/adapter.py`,
  `hf_openhands/README.md`, `STACK_OPERATIONS.md`

### bolt.diy - Die Web IDE im Browser

- Phasenbezug: `02`, `07`
- Relevante Schritte: `02.1`, `02.2`, `02.3`, `07.2`
- Heutiger Ist-Stand: bolt.diy ist absichtlich `external`-gefuehrt und als
  externer HF-Dienst dokumentiert
- Offene Luecken: keine lokale Runtime im Repo, kein lokaler Browser-IDE-Proof
- Kanonische Quelle: `BOLTDIY_EXTERNAL_INTEGRATION.md`,
  `STACK_GAP_ROADMAP.md`

### smolagents - HuggingFace Native Agents

- Phasenbezug: `03`, `05`, `07`
- Relevante Schritte: `03.1`, `03.2`, `03.3`, `03.4`, `07.2`
- Heutiger Ist-Stand: echter Agentencode mit Web, Vision und Manager-Rollen ist
  vorhanden; Integrationen zu anderen Subsystemen bleiben `partial`
- Offene Luecken: hosted Deep Browser Access, belegte Live-Bruecken zu
  LangGraph und OpenHands
- Kanonische Quelle: `hf_smolagents/app.py`, `hf_smolagents/README.md`,
  `SUPERPOWERS_STATUS.md`

### Aider - Der Git-Native Code Wizard

- Phasenbezug: `04`, `07`
- Relevante Schritte: `04.1`, `04.2`, `04.3`, `07.2`
- Heutiger Ist-Stand: Launcher, Repo-Map und Modellpfad sind klarer als die
  Live-Cloud-Strecke
- Offene Luecken: vollstaendige Oracle-/HF-Runbooks, live Pilot-zu-Aider-
  Ablaufbeweis
- Kanonische Quelle: `aider_godmode.ps1`, `hf_aider/README.md`,
  `hf_pilot_actual/app.py`

### LangGraph - Der 8-Agent Orchestrator

- Phasenbezug: `05`, `07`
- Relevante Schritte: `05.1`, `05.2`, `05.3`, `05.4`, `07.2`
- Heutiger Ist-Stand: lokale API, Compose-Runtime, `/health` und `/run` sind
  belegbar; bei externem Providerfehler faellt die Runtime kontrolliert auf
  den Offline-Pfad zurueck; das Guide-Zielbild bleibt groesser als der aktuelle
  Repo-Stand
- Offene Luecken: voller 8-Agent-Orchestrator, belastbarer Live-Beweis ueber
  mehrere Dienste hinweg
- Kanonische Quelle: `langgraph/system.py`, `langgraph/docker-compose.yml`,
  `hf_langgraph_space/app.py`, `STACK_GAP_ROADMAP.md`

### n8n - Die Automation Engine

- Phasenbezug: `06`, `07`
- Relevante Schritte: `06.1`, `06.2`, `06.3`, `06.4`, `07.2`
- Heutiger Ist-Stand: env-sichere Compose- und Workflow-Artefakte sind da; die
  produktive Operator-Importstrecke bleibt `partial`
- Offene Luecken: live Workflow-Import, aktive Credentials, produktiver
  Webhook-Nachweis
- Kanonische Quelle: `n8n/docker-compose.yml`, `n8n_mission_workflow.json`,
  `n8n_memory_workflow.json`, `MISSION_PAYLOAD_CONTRACT.md`

### Stack Integration / pilot-autonomy

- Phasenbezug: `00`, `01`, `02`, `03`, `04`, `05`, `06`, `07`
- Relevante Schritte: `00.4`, `01.4`, `02.3`, `03.4`, `04.3`, `05.3`, `06.4`,
  `07.1`, `07.2`, `07.4`
- Heutiger Ist-Stand: Mission Payload, Pilot-Loop, Adapter- und Workflow-
  Richtung sind im Repo vorhanden; der vollstaendige Live-Loop bleibt `partial`
- Offene Luecken: mehrere hosted Abhaengigkeiten und nicht fuer jede Bruecke ein
  lokal reproduzierbarer End-to-End-Proof
- Kanonische Quelle: `hf_pilot_actual/app.py`, `MISSION_PAYLOAD_CONTRACT.md`,
  `autonomy_guard.py`, `STACK_OPERATIONS.md`

### proof / frontend verification

- Phasenbezug: `00`, `07`
- Relevante Schritte: `00.4`, `07.3`, `07.4`
- Heutiger Ist-Stand: Frontend-Unterprojekt, Proof-Dateien und Missions-DONE-
  Kontrollpfad sind klar im Root verankert; Build, Playwright und AI-Browser-
  Debug sind lokal reproduzierbar
- Offene Luecken: externe Deploy- und Hosting-Events sind nicht aus dem Repo
  allein ableitbar
- Kanonische Quelle: `CoronaProjektschonwieder/`, `FINAL_PROOF.md`,
  `GODMODE_GOAL.md`, `memory_vault.md`, `autonomy_guard.py`

### ULTIMATE SUPERKRAEFTE / 12 superpowers

- Phasenbezug: `00`, `01`, `02`, `03`, `04`, `05`, `06`, `07`
- Relevante Schritte: `00.3`, `01.2`, `02.2`, `02.3`, `03.1`, `03.2`, `04.1`,
  `04.2`, `05.2`, `06.2`, `06.3`, `07.2`, `07.4`
- Heutiger Ist-Stand: mehrere Superpowers sind als Code oder Vertrag
  `implemented`, einige bleiben `partial`, vor allem dort, wo hosted Runtime
  oder Operatorarbeit noetig ist
- Offene Luecken: nicht jede Superpower ist als live End-to-End-Strecke belegt
- Kanonische Quelle: `SUPERPOWERS_STATUS.md`, `hf_smolagents/app.py`,
  `langgraph/system.py`, `n8n_*_workflow.json`, `litellm_config.yaml`

## Superpowers-Matrix

| Superpower | Status | Phasenbezug | Evidenz | Operativer Nutzen | Offene Luecke |
| --- | --- | --- | --- | --- | --- |
| 1. OpenHands Architect Mode | `partial` | `01`, `07` | `SUPERPOWERS_STATUS.md`, `hf_openhands/README.md` | standardisierte selbstpruefende Aufgabenfuehrung | upstream UI- und Runtime-Beweis bleibt teilweise extern |
| 2. Aider Ultracheap | `implemented` | `04`, `07` | `aider_godmode.ps1`, `SUPERPOWERS_STATUS.md` | guenstiger Planungs- und Implementierungspfad | live Cloud-Nachweis bleibt getrennt vom Launcher-Vertrag |
| 3. smolagents Web-Crawler | `implemented` | `03`, `07` | `hf_smolagents/app.py` | Web-Recherche und agentische Recherchepfade | live hosted Browserzugriff bleibt teilweise extern |
| 4. LangGraph Self-Evolving | `implemented` | `05` | `langgraph/system.py`, `SUPERPOWERS_STATUS.md` | Prompt-Evolution und Meta-Optimierung | groesseres Guide-Zielbild bleibt offen |
| 5. n8n Phantom Trigger | `partial` | `06`, `07` | `n8n_mission_workflow.json`, `SUPERPOWERS_STATUS.md` | eventartiger Missionsstart | produktiver importierter Workflow bleibt extern |
| 6. OpenHands + bolt.diy Feedback Loop | `partial` | `02`, `07` | `BOLTDIY_EXTERNAL_INTEGRATION.md`, `MISSION_PAYLOAD_CONTRACT.md` | Rueckkanal zwischen Browser-IDE und Agentik | bolt.diy bleibt external-only |
| 7. LiteLLM Router | `implemented` | `00`, `07` | `litellm_config.yaml`, `.godmode_env.example` | gemeinsamer Modellrouter mit Fallback-Pfad | live Routing-Zustand haengt von echten Secrets ab |
| 8. Aider Repo-Map | `implemented` | `04` | `aider_godmode.ps1`, `SUPERPOWERS_STATUS.md` | grosse Repo-Kontexte bleiben steuerbar | kein extra hosted Beweis noetig |
| 9. Vision Agent | `implemented` | `03`, `07` | `hf_smolagents/app.py` | visuelle Debug- und Pruefpfade | live Browser-/Screenshot-Strecken bleiben teilweise extern |
| 10. Parallele Agent-Swarms | `implemented` | `05`, `07` | `langgraph/system.py`, `SUPERPOWERS_STATUS.md` | parallele Analyse- und Reviewpfade | End-to-End-Nachweis ueber mehrere Dienste bleibt `partial` |
| 11. n8n AI Memory | `partial` | `06`, `07` | `n8n_memory_workflow.json`, `memory_vault.md` | persistente Lern- und Audit-Ablage | produktiver Import und Laufbeweis bleiben extern |
| 12. Context Window Injection | `implemented` | `05`, `07` | `langgraph/system.py`, `hf_smolagents/app.py` | gemeinsamer GODMODE-Kontext ueber Agentenschichten | hosted Konsistenz bleibt operatorabhaengig |

## Kontrollregeln fuer Pflege und Fortschreibung

- Neue Claims muessen immer an eine Repo-Datei, ein Script oder einen klaren
  `external`-Vermerk gebunden werden.
- `STACK_GAP_ROADMAP.md` bleibt das Soll-Ist- und Priorisierungsdokument.
- `STACK_OPERATIONS.md` bleibt die kurze Betriebs- und Startsicht.
- `walkthrough.md` bleibt der knappe High-Level-Einstieg.
- Dieses Dokument ist die zentrale 00-07-Kontrollmatrix und darf keine zweite
  Statussprache neben `implemented`, `partial`, `missing`, `external` einfuehren.
