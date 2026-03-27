# 🛡️ THE HOME ZERO GPU UND CPU SYSTEM 🛡️
*(Das alleinige, unantastbare System-Gedächtnis — V5.3 HYBRID)*

**STATUS:** ✅ AKTIVIERT & GETESTET (Hybrid: Lokal + Cloud)
**ARCHITEKTUR:** V5.3 Hybrid Render Engine (Three.js/R3F + Colab Stream)
**LETZTE AKTUALISIERUNG:** 26. März 2026

> ⚠️ ALLE VORHERIGEN CLOUD-EXPERIMENTE WURDEN OFFIZIELL VERNICHTET:
> - ~~CodeAnywhere~~ (Dead)
> - ~~Puppeteer Headless-Renderer lokal~~ (94°C Crash)
> - ~~HuggingFace Spaces Docker~~ (Cold Starts, gelöscht)
> - ~~ngrok Tunnel~~ (Token gesperrt: ERR_NGROK_3200, gelöscht)
> - ~~Oracle Cloud ARM64~~ (Kein GPU, SwiftShader zu langsam)
> 
> **NUR DAS V5.3 SYSTEM IST AKTIV.**

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

## 🚀 START-SEQUENZ

### Lokal (Standard):
```bash
cd d:\PandemieSARScov\PandemieSARScov\frontend
npm run dev
# → http://localhost:5173/
```

### Mit Cloud-Backend:
```bash
# 1. Google Colab: AAA_COLAB_V5_STATION.py ausführen
# 2. Cloudflare-URL kopieren
# 3. Browser: http://localhost:5173/?backend=https://xxx.trycloudflare.com
```

---

## 📁 AKTIVE CLOUD-DATEIEN

| Datei | Ort | Status |
|-------|-----|--------|
| `colab_server.js` | `cloud/` | ✅ NVENC H.264 Renderer |
| `package_colab.json` | `cloud/` | ✅ Colab Dependencies |
| `AAA_COLAB_V5_STATION.py` | Brain-Artifacts | ✅ Master-Deployment |

### Gelöschte Dateien (26.03.2026):
- ~~`cloud/server.js`~~ (HuggingFace V4)
- ~~`cloud/colab_setup.py`~~ (ngrok)
- ~~`cloud/scene3d.html`~~ (Standalone)
- ~~`cloud/package.json`~~ (HF Dependencies)

---

**ENDE DES DOKUMENTS — ES GIBT KEIN ANDERES SYSTEM. NUR V5.3 HYBRID.**
