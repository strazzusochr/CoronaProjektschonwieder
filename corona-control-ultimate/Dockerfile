# ---------- deps (cache layer) ----------
FROM node:20-alpine@sha256:c13b26e7a602ef2f1074aef304da809e53066606a463af4432a76f620f4f9812 AS deps
WORKDIR /app
COPY package*.json ./
# uses package-lock.json if present for deterministic installs
RUN npm ci

# ---------- build ----------
FROM node:20-alpine@sha256:c13b26e7a602ef2f1074aef304da809e53066606a463af4432a76f620f4f9812 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build   # erwartet: build -> dist

# ---------- runtime ----------
FROM node:20-alpine@sha256:c13b26e7a602ef2f1074aef304da809e53066606a463af4432a76f620f4f9812 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Nur production dependencies installieren (verwende package-lock.json)
COPY package*.json ./
COPY package-lock.json ./
RUN npm ci --only=production

# Kopiere nur das gebaute Frontend und den Server
COPY --from=build /app/dist ./dist
COPY server ./server
COPY server.cjs ./server.cjs

EXPOSE 8080
CMD ["node", "server.cjs"]
