# ─────────────────────────────────────────────────────────────────────────────
# HuntingGoals / TrendSpy — SINGLE COMBINED SERVICE (Render Web Service, Docker)
#
# One image, one URL: builds the Vite frontend AND the Next/Express backend,
# then runs backend/server.js which serves BOTH the API and the compiled
# frontend from /app/frontend/dist (SPA fallback included — see server.js).
#
# Debian (glibc) base: Puppeteer's Chromium + shared libs require glibc.
#
# Render form settings that match this file:
#   Language         = Docker
#   Root Directory   = (leave EMPTY — build context is the whole repo)
#   Dockerfile Path  = ./Dockerfile   (default)
#   Health Check     = /ping          (under Advanced)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim

# ── Chromium + the runtime libraries Puppeteer documents for Debian ─────────
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates \
      fonts-liberation \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcups2 \
      libdbus-1-3 \
      libgbm1 \
      libgtk-3-0 \
      libnspr4 \
      libnss3 \
      libx11-xcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxfixes3 \
      libxrandr2 \
      libxss1 \
      libxtst6 \
      xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Use the system Chromium — skip Puppeteer's own ~170MB Chrome download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# ── Dependency layers first (cached while manifests are unchanged) ──────────
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci                      # dev deps (vite) needed to build
COPY backend/package*.json backend/
RUN cd backend && npm ci --omit=dev

# ── Source + builds ──────────────────────────────────────────────────────────
COPY frontend ./frontend
RUN cd frontend && npm run build               # → /app/frontend/dist

COPY backend ./backend
RUN cd backend && npm run build                # Next.js production build (.next)

ENV NODE_ENV=production
# 512 MB instance: cap V8's heap so memory pressure throws a recoverable JS
# error instead of a native crash (exit 139 = SIGSEGV)
ENV NODE_OPTIONS=--max-old-space-size=400
# Render injects PORT at runtime; server.js reads process.env.PORT
EXPOSE 10000

WORKDIR /app/backend
# Force production at runtime regardless of any dashboard/env overrides —
# Next dev mode keeps webpack compilers in RAM and OOM-crashes free instances.
CMD ["sh", "-c", "exec env NODE_ENV=production node server.js"]
