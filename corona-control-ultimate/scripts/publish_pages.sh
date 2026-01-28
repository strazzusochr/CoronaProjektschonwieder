#!/bin/bash
# scripts/publish_pages.sh
# Deploy build to Cloudflare Pages

PROJECT_NAME=${CF_PAGES_PROJECT:-"corona-control-ultimate"}
BUILD_DIR="./dist"

echo "🚀 Starting Cloudflare Pages Deployment for project: $PROJECT_NAME"

if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Build directory $BUILD_DIR not found. Running build..."
    npm run build
fi

npx wrangler pages publish "$BUILD_DIR" --project-name "$PROJECT_NAME"

echo "✅ Deployment finished!"
