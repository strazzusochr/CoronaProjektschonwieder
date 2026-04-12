# AGENT_SUPERBRAIN_KONTROLLPROTOKOLL

Stand: 2026-04-12 (Snapshot-Refresh 18:41 Europe/Berlin)  
Marker: **Superbrain Merge 2026-04-12**

Dieses Dokument ist das zentrale Kontrollprotokoll fuer den Superbrain-Merge aus:

- `godmode_setup` (lokale Agenten- und Runtime-Bloecke)
- `Cgjgj/OllamaHfTrae` (externe Orchestrator-Agenten)

## 1) Wahrheits- und Statusregeln

- `VERIFIED`: nur mit Live-Probe (HTTP `200`) plus Evidence-Datei.
- `IMPLEMENTED`: Code/Vertrag existiert, aber kein Live-Probe-Beleg.
- `PARTIAL`: teilweise wired/proven.
- `BLOCKED`: Zugriff/Auth/Infra blockiert.
- `LEGACY`: historisch/guide-only.
- `PLAN`: Zielbild ohne Runtime-Beweis.
- `UNKNOWN` oder `NOT VERIFIED`: keine ausreichende Evidenz.

Jede kritische Aussage braucht Evidence. Ohne Evidence wird downgegraded.

## 2) Kanonischer Agentenkatalog

Quelle: [`agent_registry.json`](/d:/Web/docs/godmode_setup/agent_registry.json)

- Aktive Agenten: 25
- Legacy-Satz: 1
- Namespace-Regel: `local.*`, `external.*`, `legacy.*`
- Routing-Ziele: `langgraph-local`, `smolagents`, `openhands-adapter`, `hf-aider`, `ollama-hf-orchestrator`

## 3) Dispatch-Contract

Verbindlich ist der 7-Feld-Vertrag aus
[`MISSION_PAYLOAD_CONTRACT.md`](/d:/Web/docs/godmode_setup/MISSION_PAYLOAD_CONTRACT.md):

`agent`, `task`, `source`, `repo`, `ref`, `status`, `timestamp`

Hub-Endpunkte:

- `GET /agents`
- `POST /dispatch`
- `GET /routing/status`
- `POST /probe/ollama`
- `GET /evidence/latest`

Implementierung:
[`bolt_facade/app.py`](/d:/Web/docs/godmode_setup/bolt_facade/app.py)

## 4) Zero-Compute Policy

Regel:

- Lokale heavy 3D/KI-Tasks werden bei aktivierter Policy blockiert.
- Heavy-Routing muss auf remote/selfhosted/HF-Ziele laufen.

ENV:

- `ZERO_COMPUTE_POLICY=true`
- `GODMODE_ALLOW_LOCAL_HEAVY=false`

## 5) Evidence-Standorte

- Security preflight:
  [security_rotation_check_latest.json](/d:/Web/docs/godmode_setup/.godmode_runtime/evidence/security_rotation_check_latest.json)
- Hub smoke:
  [bolt_facade_api_latest.json](/d:/Web/docs/godmode_setup/.godmode_runtime/evidence/bolt_facade_api_latest.json)
- Superbrain gate:
  [superbrain_gate_latest.json](/d:/Web/docs/godmode_setup/.godmode_runtime/evidence/superbrain_gate_latest.json)
- Ollama external probes:
  [ollama_probe_latest.json](/d:/Web/docs/godmode_setup/.godmode_runtime/evidence/ollama_probe_latest.json)

## 6) Prozentmodell (2-Stufen)

- `Inventory Verified % = verified_agent_entries / 26 * 100`
- `Inventory Gate % = 100 wenn 25 aktive + 1 legacy korrekt registriert, sonst 0`
- `Contract % = passed_contract_checks / total_entrypoints * 100`
- `Routing Live % = live_routing_targets / 5 * 100`
- `Routing Gate % = (live_targets + blocked_targets_with_evidence) / 5 * 100`
- `External % = successful_ollama_probes / 3 * 100`
- `Doc % = synced_docs / 4 * 100`
- `Gesamt Beta-Core % = weighted(InventoryGate 25, Contract 20, RoutingGate 25, External 15, Doc 15)`

## 7) Freigabe

- `Beta-Core GO`: Core-Gates 100%, externe Blocker ehrlich dokumentiert.
- `GA-Full GO`: alle aktiven Agenten live-forwarded, alle externen Probes `VERIFIED`, Routing-Live `100%`, Legacy darf `LEGACY` bleiben.

Bis dahin gilt: kein "fertig", nur Gate-Status mit Evidence.

## 8) Aktueller Laufzeitstand (evidence-basiert)

Quelle:
[`superbrain_gate_latest.json`](/d:/Web/docs/godmode_setup/.godmode_runtime/evidence/superbrain_gate_latest.json)

- Inventory Verified: `96.15%` (`25/26`; alle aktiven Agenten sind live-forwarded, der Legacy-Eintrag bleibt absichtlich `LEGACY`).
- Inventory Gate: `100%`.
- Contract Gate: `100%`.
- Routing Live: `100%`.
- Routing Gate: `100%`.
- External Gate (OllamaHfTrae): `100%`.
- Doc Gate: `100%`.
- Beta-Core: `100%` -> `GO`.
- GA-Full: `100%` -> `GO` (2-Stufen-Modell: aktive Agenten live, externe Probes live, Blocker-Evidence sauber).
