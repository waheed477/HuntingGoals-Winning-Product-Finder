# 🎯 Hunting Goals — AI-Powered Winning Product Finder

> **Find winning products before your competitors.**
> Hunting Goals is a full-stack SaaS platform that analyzes real-time Facebook and Instagram ads to help Pakistani e-commerce sellers identify trending products with high profit potential.

🔗 **Live Demo:** https://huntinggoals.onrender.com
*(free tier — first load may take ~30s while the service wakes up)*

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![React](https://img.shields.io/badge/React-18.x-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)

---

## 📌 Why This Exists

Dropshippers and e-commerce sellers in Pakistan pick products by guessing, by
copying each other, or by scrolling the Meta Ad Library manually. Hunting Goals
answers the real questions **with data**:

- Which products are **multiple independent advertisers** spending on right now?
- Which ads have been **running for months** (a proven profitability signal)?
- What's trending **by city and season** (Lahore vs Karachi, Ramadan vs summer)?

The platform watches the Meta Ad Library 24/7, stores every relevant ad in
MongoDB, and converts raw ads into ranked **winning-product** clusters using a
custom scoring algorithm (advertiser diversity × days-running × spend level ×
recency). **Production state:** 233+ ads tracked across 85+ unique advertisers,
growing automatically every 6 hours.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔥 **Real-Time Ad Intelligence** | Scrapes Facebook & Instagram ads via Meta Ad Library |
| 🏆 **Win Score Engine** | Proprietary algorithm based on 4+ real ad signals |
| 🆕 **Recent Ads Strip** | Product Hunt never looks empty — freshest scraped ads always visible |
| 🤖 **AI Product Analysis** | Groq AI generates profit estimates, ad copy (Urdu/English), and supplier links |
| 📱 **Real-Time Alerts** | WhatsApp (Green API) and Email notifications when products cross thresholds |
| 📊 **Seasonal Intelligence** | 650+ keywords across 5 seasons |
| 🔐 **Authentication** | JWT-based auth + Google OAuth with session persistence |
| 🌓 **Dark/Light Mode** | User preference persists across sessions |
| 📱 **Responsive UI** | Optimized for mobile, tablet, and desktop |

---

## 🏗️ Architecture — One Service, One Port, One Dockerfile

A custom **Node.js server owns the process** and embeds **Next.js as its API
layer** (the "custom Next.js server" pattern):

```
                        ┌───────────── MongoDB Atlas ─────────────┐
                        │ 13 collections (ScrapedAd, Product, …)  │
                        └───────────────▲─────────────────────────┘
                                        │ Mongoose
 Browser (React 18 + Vite SPA)          │      12 cron jobs (node-cron)
        │  HTTP / WebSocket             │      scraping · scoring · digests
        ▼                               │      snapshots · creative archival
 ┌──────────────── backend/server.js (custom Node server) ────────────────┐
 │ Express: CORS allowlist → rate limiters → /ping → static frontend/dist │
 │ Socket.io (live updates) on the same HTTP server/port                  │
 │ /api/* ──▶ Next.js 14 request handler                                  │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     ▼
                  app/api/**/route.js (Next.js App Router — 35+ endpoints)
                   ├─ /api/products/winning   winner clusters + recent ads + stats
                   ├─ /api/ads                paginated live ads (filters)
                   ├─ /api/ads/refresh        scrape trigger (upsert pipeline)
                   ├─ /api/ads/:id/identify   Groq vision product identifier
                   ├─ /api/auth/google/*      OAuth flow
                   └─ /api/scraper/status     scheduler + DB health
```

**Why Node _and_ Next together?** Next.js alone cannot cleanly provide
Socket.io on the same port, in-process cron, custom middleware ordering, and
SPA static hosting inside one free-tier container — so Express owns the
process while Next.js (App Router handlers) provides a clean, file-based API
layer. Each technology does what it is best at, and the whole system ships as
a single Docker image.

---

## ⚙️ Data Pipeline

```
Every 6 hours (cron)                  On demand (dashboard)
        │                                  │
        ▼                                  ▼
 ┌─────────────┐  12 terms × 30 ads  ┌──────────────┐
 │ Meta Ad     │ ──────────────────▶ │ /api/ads/    │
 │ Library API │   error/timeout?    │ refresh      │
 └──────┬──────┘ ◀────────────────── └──────┬───────┘
        │ fallback: Puppeteer                │ upsert (adId unique,
        │ JSON interception (Chromium)       │ never clobbers creatives)
        ▼                                    ▼
              MongoDB `scrapedads` ◀───────────────
                       │
       hourly scoring job + on-read aggregation
                       ▼
   category clusters → winScore → winner snapshots (trend history)
                       ▼
       /api/products/winning  →  Product Hunt UI
```

---

## 🧠 Engineering Highlights

Production problems this project had to actually solve:

- **Dual-path data acquisition** — official Meta API (fast, cheap) with an
  automatic Puppeteer/Chromium fallback (JSON-response interception) when the
  token expires or permissions lapse; the system self-heals between paths.
- **A production-only bug hunt:** live dashboards served frozen zero-data
  despite a working pipeline. Root cause: Next.js **pre-renders GET route
  handlers during `docker build`** — where `MONGODB_URI` does not exist — and
  bakes the empty fallback into the image. Fixed by enforcing
  `export const dynamic = 'force-dynamic'` across all data routes and
  verifying the build route table (`ƒ Dynamic`).
- **Free-tier survival engineering** — sequential job chains with overlap
  guards (no stacked Chromium launches inside 512 MB), capped V8 heap, and a
  loopback self-call design so cron jobs reuse the exact same code path as
  user requests.
- **Session resilience** — the client auth store only clears on 401/403, so
  load-balancer 5xx/restarts never force-logout users.
- **Graceful degradation by default** — every API answers with a typed
  fallback + error field instead of crashing; the UI stays useful at zero
  data.

---

## 🛠️ Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- Zustand (persisted auth/session) + TanStack Query
- Socket.io-client (real-time updates)

### Backend
- Node.js + Express (custom server: static SPA, sockets, cron)
- Next.js 14 API routes (App Router)
- MongoDB (Atlas / Local / in-memory for dev)
- Puppeteer (ad scraping)
- Groq AI (product analysis)
- Socket.io (real-time events)
- Nodemailer (email alerts)
- Green API (WhatsApp alerts)

### Deployment
- **Single combined Docker service on Render** (Node 20 + system Chromium — serves API, frontend, cron, sockets)
- Database: MongoDB Atlas

---

## 📁 Project Structure

This repository is a **monorepo** with two independently installable applications:

```
HuntingGoals-Winning-Product-Finder/
├── frontend/                  # React 18 + Vite SPA
│   ├── src/
│   │   ├── api/               # API service wrappers
│   │   ├── components/        # Reusable UI components
│   │   ├── context/           # Theme context
│   │   ├── hooks/             # useSocket, useProducts, useTrends, ...
│   │   ├── lib/               # API client (VITE_API_URL)
│   │   ├── pages/             # Route pages (Dashboard, ProductHunt, AdSpy, ...)
│   │   ├── store/             # Zustand state management
│   │   ├── utils/             # Formatting & city helpers
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js         # Dev proxy: /api + /socket.io → :3001
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env.example           # VITE_API_URL / VITE_SOCKET_URL / VITE_APP_URL
│
├── backend/                   # Node.js + Express + Next.js API routes
│   ├── app/api/               # Next.js route handlers (/api/*)
│   ├── models/                # Mongoose schemas (13 models)
│   ├── services/              # Business logic (win score, alerts, AI, ...)
│   ├── middleware/            # Auth, logging, rate limiting, CORS
│   ├── scrapers/              # FB/IG ads, Daraz, OLX, Shopify, TikTok
│   ├── jobs/                  # 12 scheduled cron jobs (all enabled by default)
│   ├── lib/                   # DB, scheduler, Socket.io server, FB live
│   │                          # scraper, auto-scraper, chromium resolver, seed
│   ├── scripts/               # Scraper/DB utility scripts
│   ├── utils/                 # Validators & helpers
│   ├── server.js              # ONE process: API + Socket.io (PORT, default 3001)
│   ├── package.json
│   └── .env.example           # All backend variables documented
│
├── Dockerfile                 # Combined service (Render): Node + Chromium
├── render.yaml                # Render blueprint
├── newdesign.md               # Frontend redesign notes (Aug 2026)
├── README.md
└── .gitignore
```

---

## 🚀 Quick Start (Local Setup)

### Step 1: Clone the Repository

```bash
git clone https://github.com/waheed477/HuntingGoals-Winning-Product-Finder.git
cd HuntingGoals-Winning-Product-Finder
```

### Step 2: Backend

```bash
cd backend
npm install
cp .env.example .env     # then fill in the required values
npm run dev              # API + Socket.io + cron jobs → http://localhost:3001
```

> One process runs everything: the HTTP API, the Socket.io realtime layer,
> all 12 cron jobs, and the auto-scraper scheduler. Set `CRON_ENABLED=false`
> and/or `AUTO_SCRAPER_ENABLED=false` in `backend/.env` for a quiet
> frontend-only dev session.

Minimal backend `.env`:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trendspy
JWT_SECRET=your_super_secret_key_here
```

See `backend/.env.example` for all optional variables (AI, Alerts, WhatsApp, etc.).
If `MONGODB_URI` is left empty in development, the backend automatically falls
back to an embedded in-memory database (data resets on restart).

### Step 3: Frontend

```bash
cd frontend
npm install
cp .env.example .env     # optional locally — dev proxy handles /api & /socket.io
npm run dev              # Vite dev server → http://localhost:5000
```

### Step 4: Access the Application

| Service      | URL                                   |
|--------------|---------------------------------------|
| Frontend     | http://localhost:5000                 |
| Backend API  | http://localhost:3001/api/health      |
| Socket.io    | ws://localhost:3001/socket.io         |

The Vite dev server proxies `/api` and `/socket.io` → `localhost:3001`,
so no CORS or env configuration is needed for local work.

---

## ⚙️ Environment Variables (Optional Features)

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | AI-powered product analysis |
| `FB_ACCESS_TOKEN` | Meta Ad Library API (ads_read) |
| `FB_SESSION_COOKIE` | Live Facebook ad scraping (fallback path) |
| `EMAIL_USER` / `EMAIL_PASS` | Email alerts (Gmail) |
| `GREEN_API_INSTANCE_ID` / `GREEN_API_TOKEN` | WhatsApp alerts |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth login |
| `STRIPE_SECRET_KEY` | Upgrade-plan checkout (test mode) |
| `ADMIN_API_KEY` | Admin access |
| `ALERTS_ENABLED` | Enable alert system |

If not set, the app runs with fallbacks (limited functionality).

**Frontend (production builds):** set `VITE_API_URL` and `VITE_SOCKET_URL` —
see `frontend/.env.example`.

---

## 🚢 Deployment (Production)

The repo ships with a **root `Dockerfile`** that builds frontend + backend
into one image (`node:20-bookworm-slim` + system Chromium). On Render:

1. **New → Web Service** from this repo, Runtime = **Docker**
2. Root Directory: *(empty)* · Dockerfile Path: `./Dockerfile` · Health check: `/ping`
3. Environment: set `MONGODB_URI` (Atlas), `JWT_SECRET`, and any optional
   feature keys (`GROQ_API_KEY`, `FB_ACCESS_TOKEN`, `FB_SESSION_COOKIE`,
   `GOOGLE_CLIENT_*`, ...) — every feature degrades gracefully without its key.
   `GOOGLE_REDIRECT_URI` must exactly match
   `https://<your-service>.onrender.com/api/auth/google/callback`.

### Free tier note (Render)

The built-in **keep-alive self-ping** (`lib/keepAlive.js`) hits the service's
public URL every 10 minutes (`GET /ping`), preventing the free tier's
15-minute spin-down — cron jobs and Socket.io stay alive 24/7. It activates
only when `RENDER_EXTERNAL_URL` is present (Render sets it) or `KEEPALIVE_URL`
is set; opt out with `SELF_PING_ENABLED=false`.
Be aware: an always-on service uses ~730 of the free tier's ~750 monthly
instance hours, and heavy Chromium scrapes can still push past 512 MB RAM
(scrapes are serialized/staggered and the browser blocks images/fonts/media —
but expect an occasional auto-restart on the busiest job).

---

## 🗺️ Roadmap

- [ ] Meta app review for permanent `ads_read` (drop the cookie fallback)
- [ ] Junk/political-ad purge pass in the AutoCorrect job
- [ ] Move heavy scraping to a scheduled CI runner (GitHub Actions) to free the web service
- [ ] Public product pages (SEO) for each winning product

---

## 📄 License

MIT © 2025 Waheed Aslam

## 📬 Contact

Email: waheeddd62@gmail.com
GitHub: [waheed477](https://github.com/waheed477)

## 🙏 Acknowledgments

- Meta Ad Library — Ad data source
- Groq — AI language model
- Green API — WhatsApp integration
- MongoDB Atlas — Cloud database
