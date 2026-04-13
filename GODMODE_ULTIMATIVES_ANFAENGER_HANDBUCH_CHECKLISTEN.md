# GODMODE Ultimatives Anfänger-Handbuch - Checklisten

Stand: 2026-04-13

---

## 1) Day-0 Setup-Checkliste

- [ ] Accounts vorhanden: GitHub, HF, Hetzner
- [ ] Tools installiert: Git, Docker, Node, Python, PowerShell/Bash
- [ ] Repo lokal vorhanden: `d:\Web\docs\godmode_setup`
- [ ] `.godmode_env` aus Vorlage erstellt
- [ ] Pflichtvariablen gesetzt (keine Platzhalter)
- [ ] Secrets nicht im Repo gespeichert

---

## 2) Start-Checkliste (lokal)

- [ ] `ops/GODMODE_CONTROL_CENTER.ps1 -Action start-stack` ausgeführt
- [ ] `status` zeigt alle Kern-URLs
- [ ] Health-Checks antworten (`200`)
- [ ] n8n Mission/Mem-Workflow aktiv

---

## 3) Entwicklungs-Checkliste (3D)

- [ ] Dev-Server läuft (`5173`)
- [ ] Änderungen nur in vorgesehenen Dateien (`App.tsx`, `sim.ts`, `SceneCanvas.tsx`)
- [ ] Lokale Funktion im Browser geprüft
- [ ] Keine neuen Konsolenfehler

---

## 4) Gate-Checkliste (Pflicht)

- [ ] `npm test` PASS
- [ ] `npm run build` PASS
- [ ] `npm run test:browser` PASS
- [ ] `py -3 verify_superbrain_merge.py` PASS
- [ ] `py -3 verify_e2e_flows.py` PASS
- [ ] `py -3 run_final_build_test.py` PASS
- [ ] `final_build_test_result.json` ist `status=PASS`

---

## 5) Hetzner-Deploy-Checkliste

- [ ] SSH Zugriff bestätigt
- [ ] FQDN und DNS zeigen auf Zielhost
- [ ] Deploy-Skript mit Pflichtparametern ausgeführt
- [ ] `hetzner_deploy_latest.json` zeigt `PASS`
- [ ] HTTPS Endpunkte `200`
- [ ] Nur Ports `22/80/443` extern offen

---

## 6) HF-Integration-Checkliste

- [ ] `hf auth whoami` erfolgreich
- [ ] Öffentliche Spaces geprüft
- [ ] Private Spaces mit Token geprüft
- [ ] 401/404 sauber als `BLOCKED` dokumentiert (nicht schöngeredet)

---

## 7) Security-/Rotation-Checkliste

- [ ] Tokens/Passwörter rotiert
- [ ] Rotation-ACK gesetzt (`ops/set_rotation_ack.ps1 -SetNowAll`)
- [ ] `security_preflight.py` PASS
- [ ] Keine Secrets in Commit/Logs/Dokus

---

## 8) Release-Checkliste

- [ ] Snapshot/Tag vor Release gesetzt
- [ ] Doku-Sync durchgeführt
- [ ] `git status` geprüft (nur gewünschte Änderungen)
- [ ] Commit + Push erfolgreich
- [ ] Bei Bedarf Rollback-Befehl dokumentiert

