# 🎯 Hunting Goals — AI-Powered Winning Product Finder

> **Find winning products before your competitors.**
> Hunting Goals is a full-stack SaaS platform that analyzes real-time Facebook and Instagram ads to help Pakistani e-commerce sellers identify trending products with high profit potential.

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![React](https://img.shields.io/badge/React-18.x-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔥 **Real-Time Ad Intelligence** | Scrapes Facebook & Instagram ads via Meta Ad Library |
| 🏆 **Win Score Engine** | Proprietary algorithm based on 4+ real ad signals |
| 🤖 **AI Product Analysis** | Groq AI generates profit estimates, ad copy (Urdu/English), and supplier links |
| 📱 **Real-Time Alerts** | WhatsApp (Green API) and Email notifications when products cross thresholds |
| 📊 **Seasonal Intelligence** | 650+ keywords across 5 seasons |
| 🔐 **Authentication** | JWT-based auth + Google OAuth with session persistence |
| 🌓 **Dark/Light Mode** | User preference persists across sessions |
| 📱 **Responsive UI** | Optimized for mobile, tablet, and desktop |

---

## 🛠️ Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- Socket.io-client (real-time updates)

### Backend
- Node.js + Express
- Next.js 14 API routes
- MongoDB (Atlas / Local / in-memory for dev)
- Puppeteer (ad scraping)
- Groq AI (product analysis)
- Socket.io (real-time events)
- Nodemailer (email alerts)
- Green API (WhatsApp alerts)

### Deployment
- Frontend: Netlify / Vercel
- Backend: Hugging Face Spaces / Render (Docker)
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
│   │   ├── pages/             # Route pages (Dashboard, ProductHunt, ...)
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
│   ├── models/                # Mongoose schemas
│   ├── services/              # Business logic (win score, alerts, AI, ...)
│   ├── middleware/            # Auth, logging, rate limiting, CORS
│   ├── scrapers/              # FB/IG ads, Daraz, OLX, Shopify, TikTok
│   ├── jobs/                  # 10 scheduled cron jobs (all enabled by default)
│   ├── lib/                   # DB, scheduler, Socket.io server, FB live
│   │                          # scraper, auto-scraper, chromium resolver, seed
│   ├── scripts/               # Scraper/DB utility scripts
│   ├── utils/                 # Validators & helpers
│   ├── server.js              # ONE process: API + Socket.io (PORT, default 3001)
│   ├── package.json
│   ├── Dockerfile             # Render-ready (Debian + system Chromium)
│   └── .env.example           # All backend variables (Documented Option A/B)
│
├── newdesign.md               # Frontend redesign notes (Aug 2026)
├── netlify.toml               # Netlify deploy config (builds frontend/)
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
> all 10 cron jobs, and the auto-scraper scheduler. Set `CRON_ENABLED=false`
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
| `FB_SESSION_COOKIE` | Live Facebook ad scraping |
| `EMAIL_USER` / `EMAIL_PASS` | Email alerts (Gmail) |
| `GREEN_API_INSTANCE_ID` / `GREEN_API_TOKEN` | WhatsApp alerts |
| `ADMIN_API_KEY` | Admin access |
| `ALERTS_ENABLED` | Enable alert system |

If not set, the app runs with fallbacks (limited functionality).

**Frontend (production builds):** set `VITE_API_URL` and `VITE_SOCKET_URL` —
see `frontend/.env.example`. On Netlify, configure them under
*Site configuration → Environment variables*.

---

## 🚢 Deployment

### Option A — Everything on Render (Blueprint, one click) ⭐

A `render.yaml` Blueprint is included. **Render Dashboard → New → Blueprint →
select this repo → Apply** creates both services:

| Service | Type | What it is |
|---|---|---|
| `trendspy-api` | Docker web service | API + Socket.io + 9 cron jobs + Chromium scrapers — one process, one port |
| `trendspy-web` | **Free static site** (no instance hours!) | React SPA with SPA-fallback rewrite |

The Blueprint auto-wires the URLs between the two services. After the first
deploy, open **trendspy-api → Environment** and set at minimum `MONGODB_URI`
(Atlas). `JWT_SECRET` is auto-generated. Optional per-feature keys
(`EMAIL_*`, `GROQ_API_KEY`, `FB_SESSION_COOKIE`, `GOOGLE_CLIENT_*`,
`TIKTOK_*`, `GREEN_API_*`) are listed in `backend/.env.example` — every
feature the key belongs to degrades gracefully without it.
`GOOGLE_REDIRECT_URI` must be exactly
`https://trendspy-api.onrender.com/api/auth/google/callback`.

### Option B — Frontend on Netlify, backend on Render

- **Frontend → Netlify:** `netlify.toml` sets `base = "frontend"`, builds
  with `npm run build`, publishes `frontend/dist`. Set `VITE_API_URL` to the
  Render API URL in Netlify env vars; the `/api/*` proxy redirect handles
  same-origin calls.
- **Backend → Render**: deploy `backend/Dockerfile` as a Web Service
  (auto-detected). Set `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL` = your
  Netlify origin.

### Free tier note (Render)

The built-in **keep-alive self-ping** (`lib/keepAlive.js`) automatically pongs
the service's public URL every 10 minutes (`GET /ping`), which prevents the
free tier's 15-minute spin-down — cron jobs and Socket.io stay alive 24/7.
It activates only when `RENDER_EXTERNAL_URL` is present (Render sets it) or
`KEEPALIVE_URL` is set; opt out with `SELF_PING_ENABLED=false`.
Backup option: point a free external monitor (e.g. cron-job.org) at
`https://<your-service>.onrender.com/ping` instead.
Be aware: an always-on service uses ~730 of the free tier's ~750 monthly
instance hours, and heavy Chromium scrapes can still push past 512 MB RAM
(scrapes are serialized/staggered and the browser blocks images/fonts/media —
but expect an occasional auto-restart on the busiest job).

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
