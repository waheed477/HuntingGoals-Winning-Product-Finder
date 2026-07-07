# Hunting Goals — Pakistan's #1 Winning Product Hunter

> Real-time Facebook & Instagram ad intelligence platform for Pakistani e-commerce sellers.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-in--memory%20%7C%20Atlas-brightgreen)](https://mongodb.com)

---

## Quick Start (3 Steps)

```bash
# 1. Clone
git clone https://github.com/waheed477/Hunting-Goals.git
cd Hunting-Goals

# 2. Install all dependencies
npm run install:all

# 3. Copy env file and fill in your values (all optional — app runs without them)
cp .env.example backend/.env.local

# 4. Run frontend + backend API
npm run dev

# 5. (Optional) Run the socket server for real-time scraping in a second terminal
cd backend && node socket-server.js
```

| Service | URL | Required? |
|---|---|---|
| Frontend | http://localhost:5000 | ✅ Yes |
| Backend API | http://localhost:3001/api/health | ✅ Yes |
| Socket Server | http://localhost:3002 | Optional (real-time scraping) |

> **Zero-config start:** the app runs out of the box with in-memory MongoDB and a local AI fallback.  
> Add `FB_SESSION_COOKIE` to `backend/.env.local` to enable live ad scraping, and `GROQ_API_KEY` for real AI analysis.

---

## Project Structure

```
Hunting-Goals/
├── frontend/               # React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── pages/          # Route-level components
│   │   ├── components/     # Shared UI components
│   │   ├── store/          # Zustand state management
│   │   └── lib/            # API client, utilities
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── backend/                # Node.js + Express + Next.js API routes
│   ├── app/api/            # Next.js API route handlers
│   ├── models/             # Mongoose schemas
│   ├── services/           # Business logic
│   ├── scrapers/           # Facebook Ad Library scraper
│   ├── jobs/               # Scheduled cron jobs
│   ├── lib/                # DB, seed, utilities
│   ├── middleware/         # Auth, rate-limiting
│   ├── socket-server.js    # Socket.IO real-time server
│   └── server.js           # Express entry point
├── package.json            # Monorepo scripts (orchestrator)
├── .env.example            # Environment variable reference
├── .gitignore
└── README.md
```

---

## Features

| Feature | Description |
|---|---|
| 🔍 **Ad Spy** | Browse real Facebook & Instagram ads by category |
| 🏆 **Winning Products** | AI-scored products ranked by win potential |
| 📊 **Dashboard** | Live stats — total ads, trending categories, top winners |
| 📈 **Trend Scores** | 30-day search-volume history per product |
| 🤖 **AI Analyst** | Groq-powered product analysis (local fallback included) |
| 🔔 **Alerts** | Email/SMS alerts when a product spikes |
| 🗺️ **City Explorer** | Demand heatmap across Pakistan's major cities |
| 📅 **Seasonal Trends** | Seasonal product calendar & warnings |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Health check |
| GET | `/api/products` | — | All tracked products |
| GET | `/api/products/winning` | — | Top-scored products |
| GET | `/api/products/:slug/history` | — | 30-day win-score history |
| GET | `/api/ads` | — | Scraped ad library |
| GET | `/api/dashboard/stats` | — | Dashboard KPIs |
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Get JWT token |
| GET | `/api/user/profile` | JWT | User profile |
| GET/POST | `/api/alerts` | JWT | Manage price alerts |
| POST | `/api/ai/analyze` | JWT | AI product analysis |
| GET | `/api/notifications` | JWT | User notifications |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Query |
| Backend | Node.js 20, Express, Next.js 14 API routes |
| Database | MongoDB (in-memory dev / Atlas prod) |
| Real-time | Socket.IO |
| AI | Groq LLaMA (with local fallback) |
| Scraping | Facebook Ad Library API |

---

## Environment Variables

Copy `.env.example` → `backend/.env.local` for the backend, and set any `VITE_*` vars in `frontend/.env.local`.

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | **Production** | Auth token signing — required in prod |
| `MONGODB_URI` | Optional | Atlas URI; omit to use in-memory MongoDB |
| `GROQ_API_KEY` | Optional | Enables real AI analysis (free tier available) |
| `SOCKET_INTERNAL_SECRET` | Production | Internal auth between API and socket server |

Get a free Groq key at [console.groq.com](https://console.groq.com).

---

## Development Scripts

```bash
npm run dev              # Run frontend + backend concurrently
npm run dev:frontend     # Frontend only (port 5000)
npm run dev:backend      # Backend only (port 3001)
npm run install:all      # Install deps for root + frontend + backend
npm run build            # Build frontend for production
npm run build:all        # Build frontend + backend
```

---

## License

MIT © 2026 Hunting Goals
