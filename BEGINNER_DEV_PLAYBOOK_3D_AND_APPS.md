# GODMODE Quick Start (Einsteiger)

Stand: 2026-04-13

Dieses Dokument ist jetzt absichtlich kurz.  
Die vollständige A-bis-Z-Anleitung findest du hier:

- `GODMODE_ULTIMATIVES_ANFAENGER_HANDBUCH_A_Z.md`
- `GODMODE_ULTIMATIVES_ANFAENGER_HANDBUCH_TROUBLESHOOTING.md`
- `GODMODE_ULTIMATIVES_ANFAENGER_HANDBUCH_GLOSSAR.md`
- `GODMODE_ULTIMATIVES_ANFAENGER_HANDBUCH_CHECKLISTEN.md`

---

## 1) Sicherheitsstart (Pflicht)

```powershell
cd d:\Web\docs\godmode_setup
powershell -ExecutionPolicy Bypass -File .\ops\set_rotation_ack.ps1 -SetNowAll
py -3 .\security_preflight.py
```

---

## 2) Stack starten

```powershell
.\ops\GODMODE_CONTROL_CENTER.ps1 -Action start-stack
.\ops\GODMODE_CONTROL_CENTER.ps1 -Action status
```

---

## 3) 3D-Entwicklung starten

```powershell
.\ops\GODMODE_CONTROL_CENTER.ps1 -Action dev-3d
```

Browser: `http://127.0.0.1:5173`

---

## 4) Pflicht-Gates laufen lassen

```powershell
.\ops\GODMODE_CONTROL_CENTER.ps1 -Action gates-3d
py -3 .\verify_superbrain_merge.py
py -3 .\verify_e2e_flows.py
py -3 .\run_final_build_test.py
```

---

## 5) Wenn etwas kaputt ist

Nutze direkt den Fehlerkatalog:

- `GODMODE_ULTIMATIVES_ANFAENGER_HANDBUCH_TROUBLESHOOTING.md`

