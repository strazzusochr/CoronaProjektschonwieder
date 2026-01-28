# ☁️ Cloudflare Pages Deployment Guide

This guide describes how to deploy the Corona Control Ultimate frontend to Cloudflare Pages.

## 1. Prerequisites
- Cloudflare Account
- `CF_API_TOKEN` and `CF_PAGES_PROJECT` configured in your CI variables (GitLab/GitHub).

## 2. Local Testing
To test the production build locally with Cloudflare headers and functions:
```bash
npm run build
npx wrangler pages dev ./dist
```

## 3. Manual Deployment
```bash
./scripts/publish_pages.sh
```

## 4. CI/CD Integration
The `.gitlab-ci.yml` in the project root handles automatic deployment for the `main` and `develop` branches.

### Required CI Variables:
- `CF_API_TOKEN`
- `CF_PAGES_PROJECT`

## 5. Security (CSP)
Custom headers are defined in `public/_headers`. This file ensures strict CSP and optimal caching for assets and WASM.
