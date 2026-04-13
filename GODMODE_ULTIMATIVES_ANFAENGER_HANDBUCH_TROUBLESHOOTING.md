# GODMODE Ultimatives Anfänger-Handbuch - Troubleshooting

Stand: 2026-04-13

---

## 1) Startskript bricht mit Preflight-Fehler ab

### Symptom
- `Preflight failed: missing required variable ...`

### Ursache
- Pflichtwerte in `.godmode_env` fehlen oder sind Platzhalter.

### Fix
1. `.godmode_env` öffnen.
2. Pflichtvariablen setzen (`OPENHANDS_LLM_MODEL`, `OPENHANDS_LLM_BASE_URL`, `OPENHANDS_LLM_API_KEY`, `LITELLM_API_KEY`).
3. Startskript neu ausführen.

---

## 2) `npm run test:browser` schlägt fehl

### Symptom
- Playwright Timeout / Button nicht klickbar / kein Terminalzustand.

### Ursache
- UI-Zustand nicht erreicht oder Test wartet auf falschen Status.

### Fix
1. `test-results/` Screenshot öffnen.
2. Testschritt im `tests/app.spec.ts` prüfen.
3. Test erneut laufen lassen:
```powershell
npm run test:browser
```

---

## 3) Build auf Vercel scheitert mit Schema-Fehler

### Symptom
- `vercel.json` enthält ungültiges Feld wie `rootDirectory`.

### Ursache
- Nicht unterstützte Konfiguration für aktuelle Vercel-CLI.

### Fix
1. `vercel.json` gegen aktuelles Vercel-Schema prüfen.
2. Nicht erlaubte Felder entfernen.
3. Erneut deployen.

---

## 4) `vite: command not found` im CI

### Symptom
- Build findet `vite` nicht.

### Ursache
- Abhängigkeiten nicht im richtigen Unterordner installiert.

### Fix
1. Sicherstellen, dass CI im Frontend-Ordner installiert:
```bash
cd CoronaProjektschonwieder && npm install
```
2. Dann build starten.

---

## 5) Git meldet `Another git process seems to be running`

### Symptom
- Commit/Add blockiert.

### Ursache
- Hängender Editor/Git-Prozess oder altes Lockfile.

### Fix
1. Laufende Git-Prozesse schließen.
2. Prüfen, ob wirklich kein Git mehr läuft.
3. Danach `.git/index.lock` löschen und erneut versuchen.

---

## 6) LF/CRLF-Warnungen beim `git add`

### Symptom
- `LF will be replaced by CRLF ...`

### Bedeutung
- Warnung zur Zeilenende-Normalisierung, kein harter Fehler.

### Fix
- Optional `.gitattributes` konsistent pflegen.

---

## 7) n8n Webhook gibt 404

### Symptom
- `webhook not registered` / `404`.

### Ursache
- Workflow nicht importiert oder nicht aktiviert.

### Fix
1. Mission-Workflow importieren/publishen.
2. Container `n8n-godmode` neu starten.
3. Webhook erneut testen.

---

## 8) OpenHands fragt weiterhin nach Provider-Maske

### Symptom
- UI fordert Modell/URL/API-Key manuell an.

### Ursache
- `OPENHANDS_LLM_*` oder `LITELLM_API_KEY` nicht korrekt gesetzt.

### Fix
1. `.godmode_env` prüfen.
2. Stack neu starten.
3. Health-Checks ausführen.

---

## 9) Hetzner Deploy bleibt BLOCKED

### Symptom
- Deploy-Skript endet in `BLOCKED`.

### Ursache
- SSH-Auth, DNS, TLS oder Firewall-Konfiguration unvollständig.

### Fix
1. SSH Zugang prüfen.
2. DNS A-Record prüfen.
3. Deploy erneut starten.
4. Evidence in `hetzner_deploy_latest.json` lesen.

---

## 10) HF Private Space liefert 401/404

### Symptom
- Probe schlägt fehl trotz korrekter Space-ID.

### Ursache
- Token fehlt/abgelaufen oder fehlende Berechtigung.

### Fix
1. `HF_TOKEN` erneuern.
2. `hf auth whoami` prüfen.
3. Probe erneut starten.

---

## 11) Final-Build-Test FAIL

### Symptom
- `final_build_test_result.json` hat nicht `PASS`.

### Ursache
- Mindestens eines der Gates (unit/build/browser/dispatch/deep-search/math) rot.

### Fix
1. `blockers` im Result-JSON lesen.
2. Nur betroffenen Gate-Schritt fixen.
3. `py -3 run_final_build_test.py` erneut ausführen.

---

## 12) Dirty Worktree vor Release

### Symptom
- `git status` zeigt unerwartete Änderungen.

### Ursache
- Zwischenstände, generierte Artefakte oder nicht geplante Doku-Edits.

### Fix
1. Geplante vs. ungeplante Änderungen trennen.
2. Nur beabsichtigte Änderungen committen.
3. Evidence erneut erzeugen, falls nötig.

