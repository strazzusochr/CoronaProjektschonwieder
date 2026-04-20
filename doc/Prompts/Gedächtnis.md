# 🛡️ THE HOME ZERO GPU UND CPU SYSTEM 🛡️
*(Das alleinige, unantastbare System-Gedächtnis — V5.4 PRO)*

**STATUS:** ✅ STABILISIERT (Cloud Exclusive Rendering)
**ARCHITEKTUR:** V5.4 PRO (Node 24 + IPv4 Hardening + Swiftshader)
**LETZTE AKTUALISIERUNG:** 27. März 2026

> ⚠️ ALLE VORHERIGEN CLOUD-EXPERIMENTE WURDEN OFFIZIELL VERNICHTET:
> - ~~V5.3 Hybrid~~ (Kollisionsgefahr, gelöscht)


---

## 🛑 DIE GOLDENE REGEL ZUM SCHUTZ DER HARDWARE (94°C VERHINDERUNG)

Jeder KI-Agent, der an diesem Projekt arbeitet, **MUSS** diese Historie kennen:

### Verbotene Aktionen (NIEMALS tun):
1. ❌ Headless Proxy / `renderer.js` lokal installieren
2. ❌ NPCs mit `316x316` Segmentierung einzeln mappen
3. ❌ `EffectComposer` (Bloom, Vignette) aktivieren
4. ❌ Hardcoded Cloud-URLs (ngrok, trycloudflare) — nur via `?backend=URL` Query-Param
5. ❌ socket.io mit unbegrenzten `reconnectionAttempts` zu toten URLs

---

## 🏆 V5.3 HYBRID RENDER ENGINE

### Modus 1: LOKAL (Standard — kein Backend nötig)

```
Home-PC Browser → localhost:5173
  └─ React + Three.js/R3F rendert lokal:
     ├─ CityEnvironment (40 Gebäude, 35 Bäume, 12 Autos)
     ├─ NPCManager (200 Demo-NPCs via InstancedMesh)
     ├─ DayNightCycle (Echtzeit-Sonne, Mond, Phasen)
     ├─ StreetLamps (30 Laternen mit PointLights)
     └─ TelemetryHUD (Polizei-Dashboard)

CPU: ~5-10% | GPU: ~10-15% | Temp: < 55°C
```

### Modus 2: CLOUD STREAM (mit Colab-Backend)

```
Google Colab T4 GPU → Cloudflare Tunnel → Home-PC Browser
  └─ Nur Video-Empfang (H.264/MJPEG):
     └─ CPU: < 3% | GPU: 0% | Temp: < 40°C
```

### Automatischer Wechsel

Das Frontend erkennt automatisch ob ein Backend verfügbar ist:
- **Ohne `?backend=` Parameter** → LOCAL 3D ENGINE (sofort)
- **Mit `?backend=URL`** → Verbinde zu Cloud, wechsle zu Stream

---

## 🔧 TECHNISCHE SÄULEN

### 1. InstancedMesh (NPCManager.tsx)
- Einzelne `<mesh>`-Tags in Schleifen sind **VERBOTEN**
- Alle NPCs über `THREE.InstancedMesh` mit `setColorAt` / `setMatrixAt`
- Max Segmentierung: `16x16` (NPCs), `32x32` (Gebäude)

### 2. DayNightCycle (DayNightCycle.tsx)
- Echtzeit-Sonnenbewegung (60x beschleunigt: 1 Min = 1 Stunde)
- 4 Phasen: SONNENAUFGANG → TAG → SONNENUNTERGANG → NACHT
- Dynamischer Fog, Mondlicht, hemisphärisches Licht

### 3. Query-Parameter-System (App.tsx)
- **KEINE hardcoded Cloud-URLs mehr**
- Backend nur via: `?backend=https://xxx.trycloudflare.com`
- Stream nur via: `?stream=https://xxx.trycloudflare.com`
- Socket.IO: max 2 Reconnect-Versuche, 4s Timeout

### 4. Canvas-Profil
```tsx
<Canvas
  shadows
  camera={{ position: [0, 40, 70], fov: 55 }}
  gl={{ antialias: true, alpha: false }}
>
```

---

## 🚀 START-SEQUENZ V5.4 PRO

### 1. Google Colab (Master Deployment):
Nutze das verifizierte Script von GitHub (Node 24.13.0):
`python /content/COLAB_V5_4_COMPLETE.py`

### 2. Browser Start:
`http://localhost:5173/?streaming=true`
(Erzwingt den 30FPS Cloud-Stream Modus)

---

## 📁 AKTIVE DATEIEN (V5.4 PRO)

| Datei | Ort | Funktion |
|-------|-----|--------|
| `COLAB_V5_4_COMPLETE.py` | `doc/` | ✅ Master Script (GitHub) |
| `frontend/package.json` | `frontend/` | ✅ Node 24 Support |

### Vernichtete Altlasten:
- ~~`AAA_COLAB_V5_STATION.py`~~
- ~~`CLEAN_COLAB_V5_3_PRO.py`~~
- ~~`cloud/server.js`~~

---

**ENDE DES DOKUMENTS — ES GIBT KEIN ANDERES SYSTEM. NUR V5.4 PRO.**

## 🚨 CORE DIRECTIVES (27.03.2026)
1. **DEEP CHECK**: Neuer Code wird 2x auf Fehler geprüft. Erst bei 100% Sicherheit codieren.
2. **TOKEN-EFFIZIENZ**: Code direkt in Dateien schreiben, nicht im Chat wiederholen.
3. **SYSTEM VERSION**: V5.4 PRO (Node 24, IPv4, Puppeteer CDP, 30 FPS).

