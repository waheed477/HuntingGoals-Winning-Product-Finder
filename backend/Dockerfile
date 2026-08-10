# ─────────────────────────────────────────────────────────────────────────────
# HuntingGoals / TrendSpy backend — Render-ready image
# Debian (glibc) base: Puppeteer's Chrome + system Chromium require glibc;
# the old alpine variant could not run a browser at all.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim

# ── Chromium + the runtime libraries Puppeteer documents for Debian ─────────
# (libnss3/libgbm/libasound etc. are also pulled in as chromium dependencies,
#  listed explicitly per Puppeteer's "Running in Docker" guide for certainty)
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

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Build Next.js
RUN npm run build

# Render injects PORT at runtime (default 10000); server.js reads process.env.PORT
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server.js"]
