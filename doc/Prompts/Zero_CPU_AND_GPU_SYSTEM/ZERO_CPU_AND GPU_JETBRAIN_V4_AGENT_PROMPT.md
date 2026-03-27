# JETBRAIN V5.3 — ZERO HOME-PC SYSTEM ARCHITECTURE
## CORONA CONTROL ULTIMATE — Complete Technical Reference
### Stand: 26. März 2026 | Permanente Systemdokumentation

---

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║   CORONA CONTROL ULTIMATE — ZERO HOME-PC CLOUD GAMING ARCHITECTURE            ║
║   Codename: JETBRAIN V5.3 PRO | Hybrid Render Engine                         ║
║   Status:   PRODUCTION (Lokal) | STANDBY (Cloud)                              ║
║   Ziel:     0% CPU/GPU-Last auf dem Home-PC des Entwicklers                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## 1. EXECUTIVE SUMMARY

**Corona Control Ultimate** ist ein 3D-Echtzeit-Webgame (Pandemie-Simulation),
das eine vollständige Großstadt mit bis zu 1000 NPCs, einem 24-Stunden
Tag/Nacht-Zyklus, Polizei-Einsätzen und dynamischen Events simuliert.

Das **Zero Home-PC System** ist die Architektur, die es ermöglicht, diese
rechenintensive Simulation **vollständig in der Cloud** auszuführen, während
der Home-PC des Entwicklers nur als **Thin Client** (reiner Video-Empfänger)
dient. Das System entstand aus der Notwendigkeit, den Home-PC vor Überhitzung
(94°C) zu schützen.

### Kernprinzip
```
┌──────────────────────────────────────────────────────────────────────────┐
│  HOME-PC (Thin Client)     │  CLOUD (Google Colab T4 GPU)              │
│                            │                                            │
│  Browser empfängt          │  Node.js Simulation Engine (3001)          │
│  H.264 Video-Stream   ◄───│  Headless Puppeteer + Chrome (5173)        │
│                            │  NVENC H.264 Encoder → Stream (3002)      │
│  CPU-Last: < 3%            │  Cloudflare Quick Tunnel → Internet       │
│  GPU-Last: 0%              │  1080p @ 60 FPS                           │
│  Temperatur: < 45°C        │                                            │
└────────────────────────────┴────────────────────────────────────────────┘
```

---

## 2. ARCHITEKTUR-ÜBERSICHT

### 2.1 Die drei Betriebsmodi

| Modus | Wann aktiv | Was passiert |
|-------|-----------|--------------|
| **CLOUD STREAM** | Colab-Backend online, Tunnel aktiv | H.264 Video-Stream vom Cloud-GPU, 0% lokale Last |
| **LOCAL 3D ENGINE** | Kein Backend verfügbar | Three.js/R3F rendert lokal, volle 3D-Szene mit Demo-NPCs |
| **HYBRID** | Automatischer Wechsel | System erkennt Backend-Status und schaltet nahtlos um |

### 2.2 Vollständiger Datenfluss

```
                    GOOGLE COLAB (T4 GPU, 15 GB VRAM)
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    │  ┌───────────────┐    ┌──────────────┐  │
                    │  │ Simulation    │───▶│ Headless     │  │
                    │  │ Engine        │    │ Chrome +     │  │
                    │  │ (Node.js)     │    │ Puppeteer    │  │
                    │  │ Port 3001     │    │ Port 5173    │  │
                    │  └───────────────┘    └──────┬───────┘  │
                    │         │                     │          │
                    │         │ Socket.IO           │ Screenshot│
                    │         │ NPC-State            │ Pipeline  │
                    │         ▼                     ▼          │
                    │  ┌───────────────────────────────────┐   │
                    │  │  MJPEG/H.264 Video Broadcaster    │   │
                    │  │  Port 3002                        │   │
                    │  │  NVIDIA NVENC Hardware-Encoding   │   │
                    │  │  1080p @ 60 FPS, ~4 Mbit/s        │   │
                    │  └─────────────────┬─────────────────┘   │
                    │                    │                      │
                    └────────────────────┼──────────────────────┘
                                         │
                                         │ Cloudflare Quick Tunnel
                                         │ (Token-frei, auto-URL)
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │  https://xxx.trycloudflare.com          │
                    │  (Dynamische URL, jede Session neu)     │
                    └─────────────────────┬───────────────────┘
                                         │
                                         │ HTTPS/WSS
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │  HOME-PC BROWSER                        │
                    │                                         │
                    │  localhost:5173                          │
                    │  ┌───────────────────────────────────┐   │
                    │  │  Vite Dev Server (Frontend)       │   │
                    │  │  React + Three.js/R3F             │   │
                    │  │                                   │   │
                    │  │  CLOUD MODE:                      │   │
                    │  │  └─ <video> empfängt H.264 Stream │   │
                    │  │  └─ Socket.IO empfängt Telemetrie │   │
                    │  │                                   │   │
                    │  │  LOCAL MODE:                      │   │
                    │  │  └─ <Canvas> rendert 3D lokal     │   │
                    │  │  └─ 200 Demo-NPCs generiert       │   │
                    │  │  └─ Tag/Nacht-Zyklus aktiv        │   │
                    │  └───────────────────────────────────┘   │
                    │                                         │
                    │  CPU: < 3% │ GPU: 0% │ Temp: < 45°C    │
                    └─────────────────────────────────────────┘
```

---

## 3. KOMPONENTEN IM DETAIL

### 3.1 Frontend (Home-PC) — `d:\PandemieSARScov\PandemieSARScov\frontend\`

| Datei | Funktion |
|-------|----------|
| `App.tsx` | **Hybrid Render Engine** — Entscheidet zwischen Cloud-Stream und lokalem 3D |
| `components/PixelStream.tsx` | H.264 Video-Empfänger via MediaSource Extensions (MSE) |
| `components/CityEnvironment.tsx` | 3D-Stadtmodell: 40 Gebäude, 35 Bäume, 12 Autos, Ringstraße |
| `components/NPCManager.tsx` | InstancedMesh-basiertes NPC-Rendering (bis 1000 NPCs) |
| `components/DayNightCycle.tsx` | Echtzeit-Sonnenstand, 4 Phasen, Mondlicht, dynamischer Fog |
| `components/StreetLamps.tsx` | 30 Straßenlaternen mit PointLights |
| `components/TelemetryHUD.tsx` | Polizei-HUD: FPS, Polygone, Tension, Phase, NPC-Counts |
| `store/gameStore.ts` | Zustand-Store: NPC-Pool, Weltzustand, Verbindungsstatus |
| `vite.config.ts` | SWC-Compiler (schneller als Babel), HMR-Konfiguration |

### 3.2 Cloud-Backend (Google Colab) — `AAA_COLAB_V5_STATION.py`

Das **Master-Deployment-Script** für Google Colab. Ein einziges Python-Script
das die komplette Cloud-Infrastruktur automatisch aufbaut:

```python
# Vereinfachte Ablauflogik:
1. GPU-Check (nvidia-smi → T4/L4/A100 verifizieren)
2. Node.js 22 LTS installieren
3. Server-Code deployen (server.js + package.json)
4. npm install (socket.io, puppeteer, express)
5. Cloudflare Quick Tunnel starten (cloudflared)
6. Node.js Server starten (Port 3001/3002/5173)
7. Tunnel-URL ausgeben → Frontend updaten
```

### 3.3 Proxy/Bridge Server — `cloud/server.js`

```javascript
// Drei Services in einem Prozess:
Port 3001: Socket.IO → Simulation State (NPCs, Zeit, Phase, Tension)
Port 3002: MJPEG/H.264 → Video-Stream (Puppeteer Screenshots)
Port 5173: Express Static → Frontend-Build für Headless Chrome
```

### 3.4 Cloudflare Quick Tunnel

- **Token-frei** — Kein Account nötig, kein API-Key
- **Kommando**: `cloudflared tunnel --url http://localhost:3001`
- **Ergebnis**: `https://random-words.trycloudflare.com`
- **Lebensdauer**: ~24 Stunden, dann neue URL
- **Vorteil**: Keine Firewall-Konfiguration, kein Port-Forwarding

---

## 4. DAS 24-STUNDEN-SYSTEM

### 4.1 Tag/Nacht-Zyklus (`DayNightCycle.tsx`)

Die Simulation nutzt einen beschleunigten Echtzeit-Zyklus (1 Minute = 1 Stunde):

| Uhrzeit (Sim) | Phase | Lichtfarbe | Ambient | Besonderheiten |
|---------------|-------|-----------|---------|----------------|
| 05:00 - 07:00 | SONNENAUFGANG | Gold #ff6633→#ffdd88 | 0.15→0.5 | Sonne steigt, Fog wird warm |
| 07:00 - 12:00 | MORGEN / MITTAG | Warm-Weiß #ffffee | 0.5→0.8 | Hellste Phase, maximale Sicht |
| 12:00 - 18:00 | NACHMITTAG | Leicht golden | 0.8→0.5 | Sonne senkt sich |
| 18:00 - 20:00 | SONNENUNTERGANG | Rot #ff4422 | 0.5→0.15 | Dramatisches Abendrot |
| 20:00 - 05:00 | NACHT | Blau #334466 | 0.12 | Mondlicht + Laternen aktiv |

### 4.2 Beleuchtungssystem

```
Dynamische Lichtquellen:
├── DirectionalLight (Sonne) — Position basiert auf Sonnenwinkel
├── AmbientLight — Farbe wechselt mit Tageszeit
├── PointLight (Mond) — Nur nachts aktiv, kreist langsam
├── HemisphereLight — Natürlicher Himmel/Boden-Kontrast
├── 30x PointLight (Laternen) — Warmes Licht, pulsierendes Glühen
└── Fog — Farbe passt sich der Tagesphase an
```

---

## 5. NPC-SYSTEM

### 5.1 Lokaler Demo-Modus (ohne Backend)

Wenn kein Cloud-Backend verbunden ist, generiert `App.tsx` automatisch
**200 Demo-NPCs** mit folgender Verteilung:

| Typ | Anzahl | Verhalten |
|-----|--------|-----------|
| civilian | ~112 | IDLE oder JOGGING, zufällige Positionen |
| demonstrator | ~25 | IDLE, verteilt in der Stadt |
| Police | ~25 | IDLE, Patrol-Positionen |
| RiotCop | ~25 | IDLE, strategische Positionen |

NPCs mit `JOGGING`-Action bewegen sich jede Sekunde um ±0.3 Einheiten.

### 5.2 Cloud-Modus (mit Backend)

Im Cloud-Modus empfängt das Frontend via Socket.IO vollständige NPC-Daten:

```typescript
interface NPCData {
  id: string;
  position: [x: number, y: number, z: number];
  action: 'IDLE' | 'WALKING' | 'JOGGING' | 'RUNNING' | 'PATROL';
  mood: 'NEUTRAL' | 'ANGRY' | 'SCARED' | 'EXCITED';
  type: 'civilian' | 'demonstrator' | 'Police' | 'RiotCop';
}
```

### 5.3 Rendering-Technik

NPCs werden via **Three.js InstancedMesh** gerendert — eine einzige
Draw-Call für bis zu 1000 NPCs. Jeder NPC-Typ hat eine eigene Farbe:

- Civilian: Blau `#4488ff`
- Demonstrator: Orange `#ff8844`
- Police: Dunkelblau `#223366`
- RiotCop: Rot `#ff2244`

---

## 6. STADTMODELL (CityEnvironment)

### 6.1 Geometrie

| Element | Anzahl | Technik | Details |
|---------|--------|---------|---------|
| Gebäude | 40 | InstancedMesh | Höhe 3-18, Farbe `#334455` |
| Bäume | 35 | InstancedMesh (Stamm + Krone) | Grün/Braun |
| Autos | 12 | InstancedMesh | Kreisen auf Ringstraße |
| Ringstraße | 1 | RingGeometry | Radius 85, dunkelgrau |
| Boden | 1 | PlaneGeometry | 250x250, Gras `#1a3322` |

### 6.2 Performance-Budget

- **Polygon-Ziel**: ~200K Polygone (Instanced)
- **Draw Calls**: ~8 (dank Instancing)
- **FPS**: 60 FPS locked (lokal)
- **Memory**: ~50 MB GPU (WebGL)

---

## 7. HUD / TELEMETRIE-SYSTEM

### 7.1 Jetbrain Telemetry Panel (links oben)

```
┌──────────────────────────────────────┐
│ ♦ JETBRAIN TELEMETRY (HYPER-AAA)    │
│                                      │
│ TIME: 05:00 | TENSION: 24%          │
│ PHASE: ■ NACHT                       │
│                                      │
│ FPS: 60 (LOCKED)                     │
│ NPCS: 200 / 1000                     │
│ POLYGONS: 0.20M (Instanced)         │
│                                      │
│ NPC BREAKDOWN:                       │
│   Civilians: 112                     │
│   Police: 25                         │
│   Demonstrators: 25                  │
│   RiotCops: 25                       │
└──────────────────────────────────────┘
```

### 7.2 Streifen-Protokoll (rechts oben)

Zeigt Einsatzzeiten, Schicht-Status und Urgenz-Level.

### 7.3 Polizei-Telemetrie (rechts mitte)

Einsatz-Radius, Formations-Status, KI-Entscheidungs-Output.

### 7.4 Timeline-Bar (unten)

24-Stunden-Zeitleiste mit aktueller Position, Simulations-Geschwindigkeit
und Play/Pause-Controls.

---

## 8. VERBINDUNGS-MANAGEMENT

### 8.1 Query-Parameter-System

Das Frontend verbindet sich **nicht mehr automatisch** zu toten URLs.
Stattdessen wird die Backend-URL per Query-Parameter übergeben:

```
# Lokal ohne Backend (3D rendert lokal):
http://localhost:5173/

# Mit Cloud-Backend:
http://localhost:5173/?backend=https://xxx.trycloudflare.com

# Mit Video-Stream:
http://localhost:5173/?stream=https://xxx.trycloudflare.com
```

### 8.2 Socket.IO Konfiguration

```javascript
// Nur wenn ?backend=URL gesetzt:
io(backendUrl, {
  transports: ['polling', 'websocket'],
  reconnectionAttempts: 2,    // Max 2 Versuche, dann aufgeben
  timeout: 4000,              // 4 Sekunden Timeout
});
```

### 8.3 Bekanntes Problem: ERR_NAME_NOT_RESOLVED

**Ursache**: Hardcoded Cloudflare-URLs in altem Code → Tunnel abgelaufen.
**Lösung (implementiert)**: Keine Hardcoded-URLs mehr. Backend-URL nur via
Query-Parameter. Ohne Parameter = sofort lokales 3D-Rendering.

---

## 9. BUILD-SYSTEM

### 9.1 Technologie-Stack

| Komponente | Technologie | Version |
|-----------|-------------|---------|
| Runtime | Node.js | 22 LTS |
| Bundler | Vite | 6.4.1 |
| Compiler | SWC (via @vitejs/plugin-react-swc) | — |
| Framework | React | 18.x |
| 3D Engine | Three.js + @react-three/fiber | — |
| State | Zustand | — |
| Styling | Vanilla CSS + Inline Styles | — |
| Socket | socket.io-client | — |

### 9.2 Bekannte Build-Probleme und Lösungen

| Problem | Lösung |
|---------|--------|
| Babel `visitors` undefined Error | Migration zu SWC (`@vitejs/plugin-react-swc`) |
| ENOSPC (Disk voll) | npm-cache auf D: umgeleitet, Temp-Cleanup |
| Port 5174 Geisterprozess | `taskkill /F /IM node.exe` vor Neustart |
| Chrome CDP `target closed` | Nuclear Reset: alle Chrome/Edge/Node Prozesse killen |

---

## 10. DEPLOYMENT-WORKFLOW

### 10.1 Lokale Entwicklung (Standard)

```bash
cd d:\PandemieSARScov\PandemieSARScov\frontend
npm run dev
# → http://localhost:5173/
# → 3D-Szene rendert lokal mit Demo-NPCs
```

### 10.2 Cloud-Aktivierung

```
1. Google Colab öffnen → AAA_COLAB_V5_STATION.py ausführen
2. Warten bis Cloudflare-URL erscheint (z.B. https://xxx.trycloudflare.com)
3. Browser öffnen: http://localhost:5173/?backend=https://xxx.trycloudflare.com
4. System wechselt automatisch von LOCAL → CLOUD STREAM
```

### 10.3 Colab-Session Management

- **Laufzeit**: ~12 Stunden (Colab Free) / 24h (Colab Pro)
- **GPU**: NVIDIA T4 (15 GB VRAM) — kostenlos
- **Tunnel**: Cloudflare Quick Tunnel (Token-frei, ~24h Lebensdauer)
- **Neustart**: Script erneut ausführen → neue Tunnel-URL

---

## 11. EVOLUTION DER ARCHITEKTUR

### Chronologie der Versionen

| Version | Datum | Architektur | Problem |
|---------|-------|-------------|---------|
| V1-V3 | Jan-Feb 2026 | Lokales Rendering | Home-PC 94°C, Throttling |
| V4 | März 2026 | Oracle Cloud Always Free ARM64 | SwiftShader zu langsam für 60 FPS |
| V4 HF | März 2026 | Hugging Face Spaces | Socket.IO instabil, Cold Starts |
| V4 ngrok | März 2026 | ngrok Tunnel | Token revoked, ERR_NGROK_3200 |
| V5 | 25.03.2026 | Google Colab + Cloudflare | Tunnel funktioniert, aber Black Screen |
| V5.1 | 25.03.2026 | Babel→SWC Migration | visitors Error gefixt |
| V5.2 | 26.03.2026 | Disk Cleanup + Cache Redirect | ENOSPC behoben |
| **V5.3** | **26.03.2026** | **Hybrid Render Engine** | **Black Screen eliminiert** |

### Schlüssel-Entscheidungen

1. **Warum Google Colab statt Oracle Cloud?**
   Oracle ARM64 hat keine Hardware-GPU. SwiftShader (Software-GPU) erreicht
   nur 5-10 FPS. Colab bietet eine echte NVIDIA T4 GPU gratis.

2. **Warum Cloudflare statt ngrok?**
   ngrok erfordert einen API-Token der nach wenigen Stunden gesperrt wird.
   Cloudflare Quick Tunnels sind Token-frei und unbegrenzt nutzbar.

3. **Warum Hybrid statt nur Cloud?**
   Der Cloud-Tunnel ist nicht immer verfügbar (Colab-Session timeout,
   Netzwerkprobleme). Das Hybrid-System garantiert, dass die 3D-Szene
   IMMER sichtbar ist — entweder als Cloud-Stream oder als lokales Rendering.

4. **Warum SWC statt Babel?**
   Babel hatte einen fatalen `visitors undefined` Crash auf dem Host-System.
   SWC ist 20x schneller und hat diesen Bug nicht.

---

## 12. DATEISTRUKTUR

```
d:\PandemieSARScov\PandemieSARScov\
├── frontend\                          # React + Three.js Frontend
│   ├── src\
│   │   ├── App.tsx                    # ★ Hybrid Render Engine (Kern)
│   │   ├── main.tsx                   # React Entry Point
│   │   ├── components\
│   │   │   ├── CityEnvironment.tsx    # 3D Stadtmodell
│   │   │   ├── NPCManager.tsx         # InstancedMesh NPC-Rendering
│   │   │   ├── DayNightCycle.tsx       # 24h Sonnenbewegung
│   │   │   ├── StreetLamps.tsx        # 30 Laternen mit Licht
│   │   │   ├── PixelStream.tsx        # H.264 Video-Empfänger
│   │   │   └── TelemetryHUD.tsx       # Polizei-HUD
│   │   └── store\
│   │       └── gameStore.ts           # Zustand State Management
│   ├── vite.config.ts                 # SWC + HMR Config
│   ├── package.json                   # Dependencies
│   └── index.html                     # Root HTML
├── cloud\
│   ├── server.js                      # Node.js Backend (Colab)
│   └── package.json                   # Backend Dependencies
├── backend\                           # Simulation Logic
│   └── src\
│       ├── morningEvents.ts           # Morgen-Event-System
│       └── rushHourEvents.ts          # Rush-Hour-Events
└── doc\
    └── Prompts\
        └── Zero_CPU_AND_GPU_SYSTEM\
            └── ZERO_CPU_AND GPU_JETBRAIN_V4_AGENT_PROMPT.md  # ★ DIESE DATEI
```

---

## 13. TROUBLESHOOTING-REFERENZ

### Häufigste Probleme und sofortige Lösungen

| Symptom | Ursache | Fix |
|---------|---------|-----|
| **Schwarzer Bildschirm** | Kein Backend + nur PixelStream | `App.tsx` V5.3 Hybrid nutzen |
| **ERR_NAME_NOT_RESOLVED Spam** | Hardcoded toter Tunnel | Query-Param `?backend=URL` statt Hardcoded |
| **Babel visitors Error** | @babel/traverse Bug | SWC nutzen (`@vitejs/plugin-react-swc`) |
| **ENOSPC (Disk voll)** | npm-cache auf C: | `npm config set cache D:\npm-cache` |
| **Port 5174 statt 5173** | Zombie node.exe | `taskkill /F /IM node.exe` → Neustart |
| **0 NPCs sichtbar** | Kein Backend = leerer npcPool | Demo-NPCs in App.tsx generieren |
| **Zu dunkel / Kein Licht** | Statisches Ambient 0.3 | DayNightCycle.tsx mit Echtzeit-Sonne |
| **Colab Tunnel tot** | Session abgelaufen | Script erneut ausführen → neue URL |
| **CDP target closed** | Chrome-Automatisierung instabil | Nuclear Reset: alle Prozesse killen |

---

## 14. PERFORMANCE-BENCHMARKS

| Metrik | Cloud Stream | Lokal (Hybrid) |
|--------|-------------|-----------------|
| FPS | 60 (NVENC) | 60 (WebGL) |
| Auflösung | 1920x1080 | Viewport-abhängig |
| CPU (Home-PC) | < 3% | 5-15% |
| GPU (Home-PC) | 0% | 10-20% |
| Temperatur | < 40°C | < 55°C |
| NPC-Limit | 1000 | 200 (Demo) |
| Latenz | ~50-100ms | 0ms |
| Bandbreite | ~4 Mbit/s | 0 |

---

## 15. SCHRITT-FÜR-SCHRITT-ANLEITUNG (VOLLSTÄNDIG)

> **Für wen ist diese Anleitung?**
> Für jeden KI-Agenten oder menschlichen Entwickler, der dieses Projekt zum
> ersten Mal übernimmt, nach einer Pause weiterarbeitet, oder Probleme beheben
> muss. Jeder Schritt enthält eine Erklärung: **Was** wird gemacht, **Warum**
> ist es notwendig, und **Wieso** genau auf diese Weise.

---

### TEIL A: ERSTEINRICHTUNG (Einmalig bei neuem Rechner)

#### Schritt A1: Node.js installieren

**Was:** Node.js 22 LTS von https://nodejs.org herunterladen und installieren.

**Warum:** Node.js ist die JavaScript-Runtime, die sowohl den Vite-Entwicklungsserver
(Frontend) als auch den Cloud-Backend-Server antreibt. Ohne Node.js kann weder
das Frontend gebaut noch der Server gestartet werden.

**Wieso Version 22 LTS?** LTS (Long Term Support) ist die stabile Version, die
von allen verwendeten Paketen (Vite, React, Socket.IO) offiziell unterstützt wird.
Ältere Versionen (z.B. 18) haben bekannte Inkompatibilitäten mit Vite 6.

```bash
# Prüfe installierte Version:
node --version
# Erwartet: v22.x.x
```

---

#### Schritt A2: Projekt-Repository klonen/öffnen

**Was:** Das Git-Repository in den lokalen Ordner bringen.

**Warum:** Das gesamte Projekt liegt im Ordner `d:\PandemieSARScov\PandemieSARScov\`.
Ohne den Quellcode kann nichts gestartet werden.

**Wieso dieser Pfad?** Das Projekt wurde historisch auf Laufwerk D: angelegt,
um das Systemlaufwerk C: zu entlasten. Alle Pfade in der Konfiguration
referenzieren diesen Standort.

```bash
# Falls noch nicht vorhanden:
git clone <REPO_URL> d:\PandemieSARScov\PandemieSARScov

# Falls schon vorhanden: aktualisieren
cd d:\PandemieSARScov\PandemieSARScov
git pull origin main
```

---

#### Schritt A3: npm-Cache auf D: umleiten

**Was:** Den npm-Paket-Cache vom Systemlaufwerk C: auf D: verschieben.

**Warum:** Laufwerk C: hat erfahrungsgemäß wenig Speicherplatz. Der npm-Cache
kann mehrere Gigabyte groß werden und `ENOSPC`-Fehler (Disk voll) verursachen.
Dieser Fehler hat in der Vergangenheit den Build-Prozess zum Absturz gebracht.

**Wieso auf D:?** D: hat in der Regel mehr freien Speicher. Die Umleitung
ist persistent — sie muss nur einmal ausgeführt werden.

```bash
npm config set cache D:\npm-cache --global
```

---

#### Schritt A4: Frontend-Dependencies installieren

**Was:** Alle npm-Pakete des Frontends installieren.

**Warum:** Das Frontend benötigt ca. 15 Pakete (React, Three.js, Zustand,
Socket.IO, Vite, etc.). Ohne diese kann der Dev-Server nicht starten.

**Wieso `npm install` und nicht `npm ci`?** In der Entwicklungsumgebung
ist `npm install` flexibler. `npm ci` ist für CI/CD gedacht und löscht
`node_modules` komplett.

```bash
cd d:\PandemieSARScov\PandemieSARScov\frontend
npm install
```

**Erwartete Dauer:** 30-90 Sekunden (abhängig von Internetgeschwindigkeit).

**Mögliche Fehler:**
- `ENOSPC`: Schritt A3 wurde nicht ausgeführt → Cache umleiten
- `EPERM`: Editor oder anderer Prozess blockiert `node_modules` → alle IDEs schließen

---

#### Schritt A5: SWC-Compiler verifizieren

**Was:** Sicherstellen, dass `@vitejs/plugin-react-swc` in `vite.config.ts` aktiv ist.

**Warum:** Das Projekt nutzt SWC statt Babel als JavaScript-Compiler. Babel hat
einen bekannten Bug (`Cannot read properties of undefined (reading 'visitors')`)
auf diesem System, der den gesamten Build-Prozess zum Absturz bringt.

**Wieso SWC?** SWC ist in Rust geschrieben und 20x schneller als Babel.
Es hat den `visitors`-Bug nicht und produziert identischen Output.

```typescript
// vite.config.ts — MUSS so aussehen:
import react from '@vitejs/plugin-react-swc';  // ✅ SWC
// NICHT: import react from '@vitejs/plugin-react';  // ❌ Babel
```

---

### TEIL B: TÄGLICHER BETRIEB (Lokale 3D-Engine)

#### Schritt B1: Alte Node.js-Prozesse beenden

**Was:** Alle eventuell noch laufenden Node.js-Prozesse beenden.

**Warum:** Wenn ein vorheriger Vite-Server auf Port 5173 noch läuft, startet
der neue Server auf Port **5174** statt 5173. Das ist ein häufiger
Fehler, der zu Verwirrung führt, weil die URL sich ändert.

**Wieso `taskkill`?** Manche Node-Prozesse werden nicht sauber beendet,
z.B. wenn der Rechner abgestürzt ist oder die IDE unerwartet geschlossen wurde.

```powershell
# PowerShell (Windows):
taskkill /F /IM node.exe /T 2>$null
# Meldung "FEHLER: Der Prozess ... wurde nicht gefunden." ist OK (kein Prozess lief)
```

---

#### Schritt B2: Vite Dev-Server starten

**Was:** Den lokalen Entwicklungsserver starten, der das 3D-Spiel hostet.

**Warum:** Vite kompiliert den TypeScript/React-Code in Echtzeit und stellt
ihn über einen lokalen Webserver bereit. Ohne diesen Server gibt es keine
Webseite zum Anschauen.

**Wieso `npm run dev` und nicht `npm run build`?** `dev` startet den
Hot-Module-Replacement-Server (Änderungen an Dateien werden sofort im Browser
sichtbar). `build` erstellt nur die Produktions-Dateien, aber keinen Server.

```bash
cd d:\PandemieSARScov\PandemieSARScov\frontend
npm run dev
```

**Erwartete Ausgabe:**
```
  VITE v6.4.1  ready in 1500ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

**Kritisch:** Die URL MUSS `5173` sein, NICHT `5174`.
Wenn `5174` erscheint → Schritt B1 war nicht erfolgreich.

---

#### Schritt B3: Browser öffnen

**Was:** Einen Chromium-basierten Browser (Chrome, Edge, Brave) öffnen und
`http://localhost:5173/` aufrufen.

**Warum:** Das 3D-Spiel läuft vollständig im Browser. Three.js benötigt
WebGL 2.0, das nur in modernen Browsern verfügbar ist.

**Wieso nicht Firefox?** Firefox unterstützt WebGL 2.0, hat aber bekannte
Performance-Probleme mit InstancedMesh-Rendering und liefert niedrigere
FPS-Werte.

```
Browser → http://localhost:5173/
```

**Was du sehen solltest:**
- Eine 3D-Stadtszene mit Gebäuden, Bäumen und einem zentralen Park
- Einen leuchtend cyan-blauen Teich im Zentrum
- 200 bewegte NPCs (kleine Kapseln/Kugeln)
- HUD-Panels links oben und rechts oben
- Status-Badge "LOCAL 3D ENGINE" (rechts oben, orangefarben)

**Wenn du einen schwarzen Bildschirm siehst:**
→ Gehe zu Teil D: Fehlerbehebung

---

#### Schritt B4: Kamera steuern

**Was:** Mit der Maus die 3D-Kamera kontrollieren.

**Warum:** Die Standardkamera zeigt die Stadt von oben. Um Details zu sehen,
muss man navigieren können.

**Steuerung:**
| Aktion | Eingabe |
|--------|---------|
| Drehen | Linke Maustaste gedrückt + ziehen |
| Zoomen | Mausrad drehen |
| Verschieben | Rechte Maustaste gedrückt + ziehen |
| Maximaler Zoom | 10m (Nahansicht) |
| Maximaler Zoom-Out | 200m (Übersicht) |

---

### TEIL C: CLOUD-MODUS AKTIVIEREN (Optional)

#### Schritt C1: Google Colab öffnen

**Was:** https://colab.research.google.com öffnen und sich mit einem Google-Konto anmelden.

**Warum:** Google Colab bietet eine kostenlose NVIDIA T4 GPU (15 GB VRAM).
Diese GPU übernimmt die rechenintensive 3D-Szenen-Renderung, sodass der
Home-PC nur noch einen Video-Stream empfängt (CPU < 3%, GPU 0%).

**Wieso Colab und nicht ein eigener Server?** Ein eigener GPU-Server kostet
ca. 0,50-1,00 €/Stunde. Colab ist kostenlos und bietet ausreichend Leistung
für eine einzelne Rendering-Session.

---

#### Schritt C2: GPU-Runtime auswählen

**Was:** In Colab über `Laufzeit → Laufzeittyp ändern → T4 GPU` die GPU aktivieren.

**Warum:** Standardmäßig startet Colab ohne GPU. Für das H.264-Encoding und
das WebGL-Rendering benötigt das System eine echte NVIDIA-GPU.

**Wieso T4?** T4 ist die einzige GPU im kostenlosen Colab-Tier. Sie unterstützt
NVENC (Hardware-Video-Encoding), das den Stream mit 60 FPS bei nur 4 Mbit/s
erstellen kann.

---

#### Schritt C3: Deployment-Script ausführen

**Was:** Den Inhalt von `AAA_COLAB_V5_STATION.py` in eine Code-Zelle einfügen und ausführen.

**Warum:** Das Script automatisiert die komplette Server-Einrichtung:
1. Verifiziert die GPU (`nvidia-smi`)
2. Installiert Node.js 22, Xvfb, Chrome, FFmpeg
3. Erstellt den Rendering-Server
4. Startet den Cloudflare Quick Tunnel
5. Gibt die öffentliche URL aus

**Wieso ein Python-Script?** Colab-Notebooks sind Python-basiert. Das Script
nutzt Python nur als Orchestrator — die eigentlichen Server laufen in Node.js.

**Erwartete Dauer:** 3-5 Minuten für die Installation, dann sofortige URL-Ausgabe.

---

#### Schritt C4: Tunnel-URL kopieren

**Was:** In der Colab-Ausgabe die Zeile `[TUNNEL] https://xxx.trycloudflare.com`
finden und die URL kopieren.

**Warum:** Diese URL ist der öffentliche Endpunkt, über den der Home-PC den
Cloud-Server erreicht. Da der Colab-Server hinter einer Firewall läuft,
ist der Tunnel die einzige Möglichkeit der Kommunikation.

**Wieso eine zufällige URL?** Cloudflare Quick Tunnels generieren bei jeder
Session eine neue, zufällige URL (z.B. `ready-volunteering-notified.trycloudflare.com`).
Das ist ein Sicherheitsfeature — die URL ist nicht erratbar.

---

#### Schritt C5: Frontend mit Cloud verbinden

**Was:** Die kopierte URL als Query-Parameter an die lokale URL anhängen.

**Warum:** Das Frontend weiß nicht automatisch, wo der Cloud-Server ist.
Durch den Query-Parameter `?backend=URL` teilen wir ihm die aktuelle
Tunnel-Adresse mit.

**Wieso Query-Parameter statt Konfigurationsdatei?** Weil die URL sich
bei jeder Colab-Session ändert. Eine Konfigurationsdatei müsste jedes Mal
manuell editiert werden. Ein URL-Parameter ist sofort wirksam.

```
http://localhost:5173/?backend=https://xxx.trycloudflare.com
```

**Was passiert im Frontend:**
1. `App.tsx` liest den `backend`-Parameter aus der URL
2. Socket.IO verbindet sich zum Cloud-Server
3. Der Status-Badge wechselt von "LOCAL 3D ENGINE" (orange) zu "CLOUD STREAM" (grün)
4. NPC-Daten kommen nun vom Cloud-Server statt lokal generiert zu werden

---

#### Schritt C6: Cloud-Zustand überwachen

**Was:** Die Colab-Notebook-Zelle muss durchgehend laufen. Den Output beobachten.

**Warum:** Colab beendet die Laufzeit nach ~12 Stunden (Free) oder ~24h (Pro).
Wenn die Zelle stoppt, ist die Tunnel-URL sofort tot und das Frontend fällt
automatisch auf den lokalen Modus zurück.

**Woran erkennt man, dass die Cloud aktiv ist?**
- Colab-Zelle zeigt den Play-Button nicht (= läuft noch)
- Output enthält `[SERVER] Running on port 3001`
- Output enthält `[TUNNEL] https://xxx.trycloudflare.com`
- Keine roten Fehlermeldungen am Ende

---

### TEIL D: FEHLERBEHEBUNG (Troubleshooting)

#### Schritt D1: Schwarzer Bildschirm (Black Screen)

**Was passiert:** Der Browser zeigt nur einen schwarzen Hintergrund, keine 3D-Szene.

**Warum passiert es:** Das Frontend wartet auf einen Cloud-Stream, aber der
Cloud-Server ist nicht erreichbar. Vor V5.3 gab es keinen Fallback.

**Wie beheben:**
1. Prüfe die URL — ist `?backend=URL` korrekt? Ist der Tunnel noch aktiv?
2. Entferne den `?backend=` Parameter → `http://localhost:5173/`
3. Die Szene sollte jetzt im LOCAL-Modus rendern
4. Wenn immer noch schwarz: Browser-Konsole öffnen (F12) → Rote Fehler prüfen

**Wieso hilft das Entfernen des Parameters?** Ohne `?backend=` startet `App.tsx`
im Hybrid-Modus und generiert sofort 200 Demo-NPCs + das lokale 3D-Rendering.

---

#### Schritt D2: `visitors` Babel-Error

**Was passiert:**
```
[plugin:vite:react-babel] Cannot read properties of undefined (reading 'visitors')
```

**Warum:** Das Projekt nutzt `@vitejs/plugin-react` (Babel) statt
`@vitejs/plugin-react-swc` (SWC).

**Wie beheben:**
```bash
cd d:\PandemieSARScov\PandemieSARScov\frontend
npm uninstall @vitejs/plugin-react
npm install --save-dev @vitejs/plugin-react-swc
```

Dann in `vite.config.ts`:
```typescript
import react from '@vitejs/plugin-react-swc'; // NICHT '@vitejs/plugin-react'
```

**Wieso tritt der Fehler nur auf diesem System auf?** Es ist ein bekannter
Babel-Bug, der durch beschädigte Cache-Dateien oder inkompatible Babel-Plugin-
Versionen ausgelöst wird. SWC umgeht das Problem vollständig.

---

#### Schritt D3: Port 5174 statt 5173

**Was passiert:** Vite startet auf `http://localhost:5174/` statt `5173`.

**Warum:** Ein anderer Prozess blockiert bereits Port 5173.

**Wie beheben:**
```powershell
# Finde den Prozess auf Port 5173:
netstat -ano | findstr ":5173"

# Beende den blockierenden Prozess:
taskkill /F /IM node.exe /T

# Starte Vite neu:
npm run dev
```

**Wieso ist 5173 wichtig?** Alle Dokumentationen, Bookmarks und gespeicherten
URLs referenzieren Port 5173. Auf 5174 zu arbeiten führt zu Verwirrung.

---

#### Schritt D4: `ENOSPC` Disk-Fehler

**Was passiert:** npm meldet `ENOSPC: no space left on device`.

**Warum:** Der npm-Cache und die Vite-Build-Cache füllen das Systemlaufwerk.

**Wie beheben:**
```powershell
# 1. npm-Cache auf D: umleiten (permanent):
npm config set cache D:\npm-cache --global

# 2. Alten Cache löschen:
npm cache clean --force

# 3. Temp-Dateien aufräumen:
Remove-Item $env:TEMP\* -Force -Recurse -ErrorAction SilentlyContinue

# 4. Vite-Cache löschen:
Remove-Item d:\PandemieSARScov\PandemieSARScov\frontend\node_modules\.vite -Force -Recurse
```

**Wieso wird Laufwerk C: voll?** npm speichert standardmäßig alle heruntergeladenen
Pakete in `C:\Users\<Name>\AppData\Local\npm-cache`. Bei großen Projekten
wie diesem (Three.js, React, etc.) kann das mehrere GB werden.

---

#### Schritt D5: ERR_NAME_NOT_RESOLVED Spam in der Konsole

**Was passiert:** Die Browser-Konsole ist voll mit hunderten roten Fehlern:
```
net::ERR_NAME_NOT_RESOLVED
```

**Warum:** Das Frontend versucht, sich mit einer Cloudflare-URL zu verbinden,
die nicht mehr existiert (abgelaufener Tunnel).

**Wie beheben:**
1. Öffne `http://localhost:5173/` OHNE Query-Parameter
2. Der Fehler sollte sofort aufhören

**Wieso waren die Fehler da?** In älteren Versionen (vor V5.3) war die
Tunnel-URL hardcoded in `PixelStream.tsx`. Jetzt wird die URL nur noch
per Query-Parameter übergeben — kein Parameter = keine Verbindungsversuche.

---

#### Schritt D6: Nuclear Reset (Letzter Ausweg)

**Was:** Alle potenziell störenden Prozesse auf dem System beenden.

**Warum:** Manchmal laufen Chrome-Instanzen, Node-Prozesse oder Edge-DevTools
im Hintergrund und blockieren Ports, verbrauchen RAM oder halten Datei-Locks.

**Wann anwenden?** Nur wenn alle vorherigen Schritte fehlschlagen.

```powershell
# PowerShell als Administrator:
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM chrome.exe /T 2>$null
taskkill /F /IM msedge.exe /T 2>$null
taskkill /F /IM chromedriver.exe /T 2>$null

# Warte 3 Sekunden
Start-Sleep -Seconds 3

# Neustart:
cd d:\PandemieSARScov\PandemieSARScov\frontend
npm run dev
```

**Wieso dieses Vorgehen?** Die Erfahrung hat gezeigt, dass Chrome-DevTools-
Protokoll-Verbindungen (CDP) manchmal nicht sauber geschlossen werden.
Die verwaisten Prozesse blockieren dann Ports und verhindern Neustarts.

---

### TEIL E: WIEDERHERSTELLUNG NACH ABSTURZ

#### Schritt E1: System-Check nach Neustart

**Was:** Nach einem Rechner-Neustart oder Absturz die Grundvoraussetzungen prüfen.

**Warum:** Nach einem Absturz könnten Dateien beschädigt, Cache korrupt oder
Prozesse in einem inkonsistenten Zustand sein.

```powershell
# 1. Prüfe Node.js:
node --version    # Soll: v22.x.x

# 2. Prüfe Projektordner:
Test-Path d:\PandemieSARScov\PandemieSARScov\frontend\package.json
# Soll: True

# 3. Prüfe node_modules:
Test-Path d:\PandemieSARScov\PandemieSARScov\frontend\node_modules
# Soll: True (falls False → npm install erneut)

# 4. Prüfe freien Speicher:
Get-PSDrive C | Select-Object Free
# Soll: > 1 GB
```

---

#### Schritt E2: Vite-Cache bereinigen

**Was:** Den Build-Cache von Vite löschen und sauber neu starten.

**Warum:** Beschädigte Cache-Dateien (z.B. nach einem Absturz während eines
Compile-Vorgangs) können zu kryptischen Fehlermeldungen führen.

**Wieso den gesamten Cache?** Teilweise löschungen können zu inkonsistenten
Zuständen führen. Ein kompletter Clean ist sicherer.

```powershell
# Vite-Cache löschen:
Remove-Item d:\PandemieSARScov\PandemieSARScov\frontend\node_modules\.vite -Force -Recurse -ErrorAction SilentlyContinue

# Dev-Server starten (baut Cache automatisch neu auf):
cd d:\PandemieSARScov\PandemieSARScov\frontend
npm run dev
```

---

#### Schritt E3: Vollständiger Clean-Install

**Was:** Alle Dependencies komplett neu installieren.

**Warum:** Wenn nichts anderes hilft, kann ein korruptes `node_modules`-Verzeichnis
die Ursache sein. Ein Clean-Install löst 95% aller unerklärlichen Fehler.

**Wieso nicht einfach `npm install`?** `npm install` aktualisiert nur fehlende
Pakete. Bei korrupten Paketen erkennt es das Problem nicht. Nur ein vollständiges
Löschen und Neuinstallieren garantiert einen sauberen Zustand.

```powershell
cd d:\PandemieSARScov\PandemieSARScov\frontend

# 1. Alles löschen:
Remove-Item node_modules -Force -Recurse -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue

# 2. Neu installieren:
npm install

# 3. Dev-Server starten:
npm run dev
```

**Erwartete Dauer:** 1-3 Minuten.

---

### TEIL F: REFERENZ-KARTE (Quick Reference)

```
╔════════════════════════════════════════════════════════════════════════╗
║  SCHNELLSTART-BEFEHLE                                                ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  LOKAL STARTEN:                                                      ║
║  cd d:\PandemieSARScov\PandemieSARScov\frontend                      ║
║  npm run dev                                                         ║
║  → http://localhost:5173/                                            ║
║                                                                      ║
║  MIT CLOUD:                                                          ║
║  → http://localhost:5173/?backend=https://xxx.trycloudflare.com      ║
║                                                                      ║
║  PROBLEME:                                                           ║
║  taskkill /F /IM node.exe /T          ← Port-Konflikte lösen        ║
║  npm cache clean --force              ← Disk-Platz schaffen         ║
║  Remove-Item node_modules -Recurse    ← Clean Install vorbereiten   ║
║                                                                      ║
╚════════════════════════════════════════════════════════════════════════╝
```

---

## 16. ZUKUNFT / ROADMAP

- [ ] Oracle Cloud ARM64 mit GPU (A10G) wenn Always Free erweitert wird
- [ ] WebRTC statt MJPEG für geringere Latenz
- [ ] Persistente Tunnel-URL (Cloudflare Zero Trust, kostenloser Tier)
- [ ] NPC-KI via Python/FastAPI auf Colab GPU
- [ ] Multiplayer-Support via WebSocket-Rooms
- [ ] Mobile responsive Layout

---

*Dieses Dokument ist die permanente technische Referenz für das Zero Home-PC
Cloud Gaming System. Es wird bei jeder Architekturänderung aktualisiert.*

*JETBRAIN V5.3 PRO — Hybrid Render Engine*
*Letzte Aktualisierung: 26. März 2026*

