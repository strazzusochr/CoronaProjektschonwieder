# README_DEPLOY — Deployment-Anleitung (Cloud Build → Cloud Run)

Kurz: diese Anleitung enthält **alle Befehle**, die du brauchst, um den Cloud Build Trigger zu importieren, Artifact Registry / IAM einzurichten, ein einmaliges manuellen Deploy zu starten und das Ergebnis zu prüfen. Ersetze **unbedingt** die Platzhalter `YOUR_PROJECT_ID`, `YOUR_GITHUB_ORG`, `YOUR_REPO_NAME` bevor du Befehle ausführst.

---

## Voraussetzungen

- `gcloud` CLI installiert und konfiguriert.
- Du hast Schreibrechte im Ziel-GCP-Projekt und Admin-Rechte im GitHub-Repo (für OAuth-Verbindung).
- `trigger.yaml` und `cloudbuild.yaml` liegen im Repo-Root.

---

## 1) Lokale Variablen (empfohlen)

```bash
export PROJECT_ID="YOUR_PROJECT_ID"
export GITHUB_ORG="YOUR_GITHUB_ORG"
export REPO_NAME="YOUR_REPO_NAME"
```

Optional: Ersetze Platzhalter in trigger.yaml (Backup wird erstellt):

```bash
cp trigger.yaml trigger.yaml.bak
# macOS/BSD sed
sed -i '' -e "s/YOUR_GITHUB_ORG/${GITHUB_ORG}/g" -e "s/YOUR_REPO_NAME/${REPO_NAME}/g" trigger.yaml
# Linux GNU sed (kein '')
# sed -i -e "s/YOUR_GITHUB_ORG/${GITHUB_ORG}/g" -e "s/YOUR_REPO_NAME/${REPO_NAME}/g" trigger.yaml
cat trigger.yaml
```

---

## 2) Projekt setzen & APIs aktivieren

```bash
gcloud config set project ${PROJECT_ID}

gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com
```

---

## 3) Artifact Registry erstellen (einmalig)

```bash
gcloud artifacts repositories create webgame-repo \
  --repository-format=docker \
  --location=europe-west3 \
  --description="Docker registry for webgame images"
```

---

## 4) Cloud Build GitHub-Verbindung (OAuth)

Dieser Befehl startet einen Browser-OAuth-Flow. Der ausgeführte Account muss GitHub-Org-Admin (oder Repo-Admin) bestätigen.

```bash
gcloud builds connections create github github-connection --region=global
```

Wenn die Verbindung bereits besteht, erscheint eine Fehlermeldung — das ist ok.

---

## 5) Cloud Build Service Account: IAM-Rollen vergeben

```bash
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Cloud Run deploy permission
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/run.admin"

# Service Account User
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"

# Artifact Registry writer (falls verwendet)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/artifactregistry.writer"
```

---

## 6) Trigger importieren

```bash
# importiert trigger.yaml
gcloud builds triggers import --source=trigger.yaml

# prüfen
gcloud builds triggers list
gcloud builds triggers describe webgame-cloudrun-deploy
```

---

## 7) Trigger testen — empfohlene Methode: Safe Commit auf main

```bash
git checkout main
git pull origin main
# Erstelle kleinen Test-Commit
git commit --allow-empty -m "ci: trigger test"
git push origin main
```

- Gehe in die Cloud Console → Cloud Build → History, verfolge Build.
- Oder in der Console: Cloud Build → Triggers → wähle Trigger → Run trigger.

---

## 8) Sofort-Deployment manuell (Alternative)

Nutze diese Befehle, falls du manuell sofort deployen möchtest (aus Repo-Root):

```bash
# Variante: Cloud Build nutzt cloudbuild.yaml aus Repo
gcloud builds submit --config cloudbuild.yaml .

# oder: lokal bauen, pushen und deployen (Artifact Registry)
docker build -t europe-west3-docker.pkg.dev/${PROJECT_ID}/webgame-repo/webgame:latest .
docker push europe-west3-docker.pkg.dev/${PROJECT_ID}/webgame-repo/webgame:latest

gcloud run deploy webgame \
  --image europe-west3-docker.pkg.dev/${PROJECT_ID}/webgame-repo/webgame:latest \
  --region=europe-west3 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080
```

---

## 9) Verifikation nach Deploy

```bash
SERVICE_URL=$(gcloud run services describe webgame --region=europe-west3 --format='value(status.url)')
echo "Service URL: $SERVICE_URL"

# Header checks
curl -I $SERVICE_URL/index.html
curl -I $SERVICE_URL/path/to/physics.wasm

# Logs & Revisions
gcloud run revisions list --service webgame --region=europe-west3
gcloud logs read --project=${PROJECT_ID} --limit=100
```

Erwartete Header:
- `index.html` → `Cache-Control: no-cache, no-store, must-revalidate`
- `*.wasm, *.glb, *.ktx2` → `Cache-Control: public, max-age=31536000, immutable` und `Content-Type: application/wasm` für `.wasm`

---

## 10) Troubleshooting (häufige Fehler & Lösungen)

- **OAuth / GitHub Connect schlägt fehl:** Entferne alte Connections in Cloud Console → Cloud Build → Connections und wiederhole `gcloud builds connections create github ...`.
- **Import-Fehler: invalid filename:** Prüfe, dass `cloudbuild.yaml` im Repo-Root liegt.
- **Build schlägt fehl:** `gcloud builds log BUILD_ID` prüfen; Ursachen: `npm run build` Fehler, fehlende `package-lock.json`, falsche Node-Version.
- **Deploy fehlschlägt / Service not found:** Prüfe Cloud Build Logs; IAM-Bindings (siehe Schritt 5).
- **403 Artifact Registry Push:** Cloud Build SA benötigt `roles/artifactregistry.writer`.
- **index.html wird weiter gecached:** Prüfe CDN/GCS-Metadaten; CDN kann Cache-Control überschreiben.
- **Socket.IO Probleme:** Prüfe CORS origin, verwende gültige Produktions-Domains.

---

## 11) Quick Wins / Verbesserungen (empfohlen)

- Pinne Base Image:
```dockerfile
FROM node:20-alpine@sha256:<PASTE_DIGEST>
```
- Health-Endpoint in `server.cjs`:
```js
app.get('/health', (_, res) => res.status(200).send('ok'));
```
- Setze Cloud Run Ressourcen:
```bash
gcloud run services update webgame --region=europe-west