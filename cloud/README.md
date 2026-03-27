# JETBRAIN V5.3 — Cloud Backend (Google Colab + Cloudflare)

> **ACHTUNG**: Dies ist das EINZIGE korrekte Cloud-System.
> Alle alten Systeme (HuggingFace, ngrok, Oracle ARM64) wurden entfernt.

## Aktuelle Architektur

```
Google Colab (T4 GPU) → Node.js Server → Cloudflare Quick Tunnel → Home-PC Browser
```

## Dateien in diesem Ordner

| Datei | Status | Beschreibung |
|-------|--------|-------------|
| `colab_server.js` | ✅ AKTIV | NVENC H.264 Cloud Renderer (Port 7860) |
| `package_colab.json` | ✅ AKTIV | Dependencies für Colab Server |

## Deployment

1. Öffne Google Colab → GPU Runtime (T4)
2. Führe `AAA_COLAB_V5_STATION.py` aus (liegt im Brain-Artifact-Ordner)
3. Kopiere die Cloudflare-URL
4. Öffne: `http://localhost:5173/?backend=https://xxx.trycloudflare.com`

## Gelöschte veraltete Dateien (26.03.2026)

- ~~`server.js`~~ → War HuggingFace V4 (Port 7860, SwiftShader)
- ~~`colab_setup.py`~~ → Nutzte ngrok (Token gesperrt seit März 2026)
- ~~`scene3d.html`~~ → Alte Standalone-3D-Szene
- ~~`package.json`~~ → Alte HuggingFace Dependencies
