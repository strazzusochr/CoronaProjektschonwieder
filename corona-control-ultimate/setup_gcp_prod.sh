#!/bin/bash
# GCP Setup Script for Corona Control Ultimate

echo "🚀 Starting GCP Infrastructure Setup..."

# 1. Projekt Configuration
PROJECT_ID="gen-lang-client-0857108312"
PROJECT_NUMBER="115141732954171490356"
gcloud config set project ${PROJECT_ID}

# 2. APIs aktivieren
echo "📦 Enabling APIs..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com

# 3. Artifact Registry erstellen
echo "🏗️ Creating Artifact Registry..."
gcloud artifacts repositories create webgame-repo \
  --repository-format=docker \
  --location=europe-west3 \
  --description="Docker registry for webgame images" || echo "Note: Repository might already exist."

# 4. IAM Rollen für Cloud Build Service Account
echo "🔑 Configuring IAM..."
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/artifactregistry.writer"

# 5. GitHub Verbindung (Manueller OAuth Flow erforderlich!)
echo "🔗 GitHub OAuth Connection requested..."
echo "Please run this command manually to connect your GitHub account:"
echo "gcloud builds connections create github github-connection --region=global"

# 6. Trigger importieren
echo "⚡ Importing Cloud Build Trigger..."
# Hinweis: Platzhalter in trigger.yaml müssen vorher ersetzt werden
gcloud builds triggers import --source=trigger.yaml || echo "Note: Trigger import requires valid GitHub connection."

# 7. Cloud Run Ressourcen & Skalierung optimieren
echo "⚙️ Tuning Cloud Run Resources..."
gcloud run services update corona-control-ultimate \
  --region=europe-west3 \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=5 \
  --platform=managed || echo "Note: Service update might require a first deployment."

echo "✅ Master Setup Script complete. Next step: Push to 'main' branch to trigger first production deploy."
