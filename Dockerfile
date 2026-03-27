FROM node:22-bookworm-slim

# Install Chromium and dependencies for headless rendering
RUN apt-get update && apt-get install -y \
    chromium \
    xvfb \
    libgbm-dev \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    fonts-liberation \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV DISPLAY=:99
ENV NODE_ENV=production

WORKDIR /app

# Copy package files first for better caching
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY proxy/package*.json ./proxy/
COPY cloud/package.json ./cloud/

# Install dependencies
RUN cd backend && npm install --omit=dev 2>/dev/null; \
    cd /app/frontend && npm install; \
    cd /app/proxy && npm install --omit=dev 2>/dev/null; \
    cd /app/cloud && npm install --omit=dev 2>/dev/null

# Copy all source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY proxy/ ./proxy/
COPY cloud/ ./cloud/

# Frontend dist/ is pre-built and included in the repo
# No build step needed — reduces Docker build time significantly

# Expose the unified port
EXPOSE 7860

# Start: Xvfb + unified cloud server
CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x720x24 -nolisten tcp & sleep 1 && node cloud/server.js"]
