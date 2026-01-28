#!/bin/bash
# Automatisiertes Deployment für React/Vite/Three.js/Rapier Webgame auf Cloud Run

# ------------------------------
# CONFIGURATION
# ------------------------------
PROJECT_ID="gen-lang-client-0857108312"       # GCP Project ID
PROJECT_NUMBER="115141732954171490356"
REGION="europe-west3"                   # Cloud Run Region
SERVICE_NAME="corona-control-ultimate" # Name des Cloud Run Services
IMAGE_TAG="latest"                        # Container-Tag
SA_KEY_FILE="<PATH_TO_SERVICE_ACCOUNT_KEY>.json" # Pfad zur Service Account JSON (Muss bereitgestellt werden)
MAX_INSTANCES=3
MEMORY=512Mi
CPU=1

# ------------------------------
# AUTHENTICATION
# ------------------------------
echo "Authentifiziere Service Account..."
if [ -f "$SA_KEY_FILE" ]; then
  gcloud auth activate-service-account --key-file="$SA_KEY_FILE"
else
  echo "⚠️ SA_KEY_FILE nicht gefunden. Versuche Standard-GCP-Login..."
  gcloud auth login
fi
gcloud config set project $PROJECT_ID

# ------------------------------
# BUILD & PUSH CONTAINER
# ------------------------------
echo "Baue Container und pushe zu GCR..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG .

# ------------------------------
# DEPLOY TO CLOUD RUN
# ------------------------------
echo "Deploy auf Cloud Run starten..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --max-instances $MAX_INSTANCES \
  --memory $MEMORY \
  --cpu $CPU

# ------------------------------
# POST-DEPLOY CHECK
# ------------------------------
echo "Deployment abgeschlossen. Prüfe die URL..."
gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)"

echo "Optional: Monitoring Alerts importieren: monitoring-alerts.yaml"
