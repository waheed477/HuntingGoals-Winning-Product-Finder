# TrendSpy — Project Context

> **Hunting Goals — Winning Product Finder** for the Pakistani e-commerce market.
> A full-stack intelligence platform that scrapes real market signals (Facebook Ads,
> Daraz, OLX, Google Trends, TikTok, suppliers), scores products with an AI-assisted
> "Win Score", and pushes live alerts to sellers — wrapped in a real-time dashboard.

---

## 1. What It Does (One Paragraph)

TrendSpy helps Pakistani dropshippers/e-commerce sellers discover **winning products** before
they saturate. Background scrapers continuously collect ads and market data, a weighted scoring
engine ranks products, Groq-powered AI explains *why* a product is hot and generates ad copy,
and users get alerts (in-app, email, WhatsApp) plus a daily digest. Subscriptions are handled
by Stripe (test mode), sign-in works via email OTP or Google OAuth, and everything updates
live over Socket.io.

---

## 2. Tech Stack

### Backend (`/backend`)
| Layer | Technology |
|---|---|
| Runtime | **Node.js** (ESM), single process |
| API framework | **Next.js 14** (App Router route handlers) mounted behind a custom server |
| HTTP wrapper | **Express 4** — CORS allow-list, rate limiting, structured request/response logging |
| Realtime | **Socket.io 4** attached to the same HTTP server (JWT-authenticated rooms) |
| Database | **MongoDB + Mongoose 8** (Atlas in prod, local/`mongodb-memory-server` fallback in dev) |
| Auth | **JWT** (`jsonwebtoken`) + `bcryptjs`, email-OTP verification, Google OAuth 2.0 |
| Scheduling | **node-cron** — 9 cron jobs + a staggered auto-scraper scheduler |
| Scraping | **Puppeteer 24** (+ `puppeteer-extra` stealth plugin), Playwright, Cheerio, axios |
| AI | **Groq SDK** (LLaMA-class models) with a built-in local analysis fallback |
| Payments | **Stripe** (Checkout Sessions, signature-verified webhooks) — test mode |
| Email | **Nodemailer** (Gmail SMTP / app password) — transport verified at boot |
| Data sources | `google-trends-api`, FB Ad Library (cookie session), Daraz/OLX HTML, news feeds |

### Frontend (`/frontend`)
| Layer | Technology |
|---|---|
| Framework | **React 18 + Vite 5** (SPA) |
| Styling | **Tailwind CSS 3** (dark glass theme, custom design tokens) |
| Routing/state | React Router 6, **Zustand**, TanStack Query 5 |
| Realtime | `socket.io-client` (auto-reconnect, API-origin aware) |
| Maps/charts | **Leaflet + react-leaflet** (City Explorer), **Recharts** (trends/analytics) |
| UX | Central toast system (`react-hot-toast` + friendly error sanitizer, screen-centered), inline `AuthMessage` banners on auth pages, guided Welcome Tour, react-icons, date-fns |

### Infrastructure
- **Render.com free tier** — Docker web service (backend) + static site (frontend), wired via `render.yaml` Blueprint
- System **Chromium in Docker** (bookworm-slim) for Puppeteer on a 512 MB instance
- **Keep-alive self-ping** (every 10 min) to counter free-tier spin-down
- MongoDB Atlas M0 (free) as the production database

---

## 3. Monorepo Layout

```
├── frontend/                  # React + Vite SPA
│   └── src/
│       ├── pages/             # Landing, Login, Onboarding, Dashboard, ProductHunt,
│       │                      #   CityExplorer, Trends, AdSpy, Profile, Notifications,
│       │                      #   BillingSuccess, legal pages…
│       ├── components/        # Layout, Sidebar, UpgradePlanModal, AIReportModal,
│       │                      #   WelcomeTour (+ public/mascot-hunter.png), AuthMessage…
│       ├── lib/               # api.js (fetch wrapper), toast.js, baseUrl.js
│       ├── hooks/             # useSocket, useAdsRealtime
│       └── store/             # zustand store (auth user + token)
├── backend/                   # Single-process server (Express + Next + Socket.io + cron)
│   ├── server.js              # Entry: env → MongoDB → Next prepare → listen → jobs
│   ├── app/api/**             # 60 Next.js API routes (see §6)
│   ├── lib/                   # socketServer, autoScraper, scheduler, fbLiveScraper,
│   │                          #   chromium, corsOrigins, keepAlive, stripe, initDb…
│   ├── jobs/                  # 9 cron jobs (scoring, alerts, digest, TikTok…)
│   ├── scrapers/              # FB ads, Daraz, OLX, trends, news, suppliers
│   ├── services/              # groq, email, alert, winScore, adWinning,
│   │                          #   productIdentificationAgent (vision), sourcingAdviceAgent,
│   │                          #   supplierMatching (shared: /suppliers/match + identify flow)
│   ├── models/                # Mongoose schemas (User, Ad, Product, Supplier…)
│   ├── middleware/            # auth (withAuth/JWT), rateLimit, logger
│   └── Dockerfile             # bookworm-slim + system Chromium
├── render.yaml                # Render Blueprint: trendspy-api + trendspy-web
└── netlify.toml               # alternative static hosting for frontend
```

---

## 4. Feature Catalogue (A–Z)

### 🔐 Auth & Accounts
- Email/password **register → OTP verify → onboarding** (city, categories, platforms)
- **Google OAuth** ("Continue with Google") — account linking by email/googleId
- JWT sessions (7-day), logout, `/auth/me`, forgot/reset password (token flow)
- Profile management: city/categories/platforms, phone (PK-format validated), notification prefs
- **Personal API key** generation (plan-gated), GDPR data export, delete account

### 📊 Dashboard
- Live stats (products tracked, ads scraped, alerts), city-filtered winning products
- Real-time notifications feed + unread count (30 s poll + socket push)

### 🏆 Product Hunt & Win Score
- Weighted **Win Score** (winner ≥ 75): Daraz 20 · FB Ads 20 · Trends 15 · TikTok 15 ·
  OLX 10 · Alibaba/suppliers 10 · Seasonality 10
- Hourly ScoreJob recalculation; per-product history & score breakdown endpoints
- Seasonal filtering & event-aware recommendations (Eid, winter, back-to-school…)

### 🗺️ City Explorer (Local Trends)
- 10 Pakistani cities, Leaflet map UI, city-scoped ad/trend data (`/international/local`)

### 📈 Trends
- Google Trends ingestion + local news signals; per-product trend timeline

### 🕵️ Ad Spy (Facebook)
- **Puppeteer + stealth** scrapes FB Ad Library with a session cookie; intercepts GraphQL
  ad payloads (images/fonts blocked for RAM), JSON-API fallback, dedup on save
- Manual refresh with custom search term; real-time push of new ads to the UI

### 🤖 AI Analyst (Groq)
- Product analysis (`/ai/analyze`), AI report modal, AI **ad-copy generation** (`/ai/adcopy`)
- Graceful local-analysis fallback when `GROQ_API_KEY` is absent

### 🔍 Product Identifier & Sourcing Advice (on-demand AI)
- **Identify Exact Product** button on every Ad Spy card → Groq **vision** call reads the
  ad image + copy and names the *specific sourceable product* (not just a category),
  with key features, a confidence score, and a reasoning trace stored for audit
- Results are **cached on the ad forever** — repeated clicks never re-bill the AI;
  low-confidence results show an explicit "AI-estimated, verify manually" disclaimer
- On success, a real `Product` doc is resolved/created and **matched suppliers** are
  linked fire-and-forget (shared `supplierMatching` service)
- **Get Sourcing Advice** → text-model call with a condensed product context returns
  conservative test-batch advice for Pakistani sellers (stock size, PKR price point,
  competition level, ad angle) — also DB-cached, expandable card UI
- On-demand only by design — **not** wired into any cron/scheduler; both endpoints are
  `aiLimiter`-rate-limited; everything degrades gracefully without API keys (no crashes)

### 🔔 Alerts & Notifications
- Alert rules per user; **AlertJob every 30 min** matches new data → in-app + **email** + **WhatsApp** (Green API)
- Daily digest email at **08:00 PKT**; test endpoints for email/WhatsApp

### 🏭 Suppliers
- Supplier discovery scraper (Alibaba etc.), supplier matching per product, admin verification queue

### 🎵 TikTok
- Official TikTok API (sandbox tier) — trending/search, daily 4 AM sync job

### 💳 Billing (Stripe, test mode)
- `UpgradePlanModal` → **Stripe Checkout** (Pro $19/mo, Business $49/mo, recurring)
- Instant `/billing/confirm` on return + signature-verified **webhook** (activate / auto-downgrade on cancel)
- Plan badge in Profile (`free` / `pro` / `business`)

### 🎓 Welcome Tour (first-visit onboarding)
- Guided multi-step tour (`components/WelcomeTour.jsx` + branded mascot `public/mascot-hunter.png`)
  that walks a brand-new user through the dashboard's core areas (Hunt, City Explorer, Ad Spy, AI…)
- Wired through `Layout.jsx`/`Sidebar.jsx`; runs for first-time users and can be dismissed
  without breaking navigation — purely client-side, no backend round-trips

### 🎨 Message & Toast UX
- **Auth pages show feedback INLINE, never as popups** — `components/AuthMessage.jsx` banner
  renders directly above the first form field on Login/Signup, VerifyEmail, and ForgotPassword
  (error = soft-red glass + **❗ exclamation icon**; success = acid tint + ✓; slide-down
  animation, `role="alert|status"`). Server error strings surface verbatim; nothing routes
  through the toast layer on these pages.
- **Every non-auth toast renders at screen CENTER** (`App.jsx` Toaster override: `top-center`
  + `translateY(-50%)`), dark-glass theme preserved, custom per-type icons (**❗ replaces ✕**
  on errors, ✓ on success), elevated drop shadow, **2 s auto-dismiss**.
- `lib/toast.js` message sanitizer untouched — friendly, profanity-filtered text everywhere.

### ⚙️ Platform Engineering
- Single process: Next API + Express middleware + Socket.io + all cron jobs (one Render instance)
- CORS allow-list (bare-host → https normalization), per-route rate limits (loopback-exempt),
  structured JSON request logs, central styled toasts
- `/ping` health check, `/health`, `/scraper/status`, `/cron/status` introspection
- Keep-alive self-ping on Render free tier; dev fallback to in-memory MongoDB
- Manual scraper triggers: `POST /api/scraper/trigger` (`facebookAds|daraz|olx|googleTrends|news|suppliers`)

---

## 5. Background Schedules

**Cron jobs (always-on by default; `*_ENABLED=false` to opt out):**

| Job | Schedule | Purpose |
|---|---|---|
| ScrapeJob | every 6 h (:00) | core product scrape |
| TrendJob | every 12 h (:00) | trends ingestion |
| FbAdsJob | every 12 h (:17) | FB ads pipeline |
| ScoreJob | hourly :05 | Win Score recalculation |
| AlertJob | every 30 min | user alert matching → email/WhatsApp |
| CompetitorJob | every 6 h | competitor tracking |
| AutoCorrectJob | every 12 h (:47) | data hygiene/auto-correction |
| TikTokJob | daily 04:00 | TikTok trending sync |
| DigestJob | daily 08:00 PKT | daily digest email |

**Auto-scraper scheduler (staggered, loopback triggers):**
FB Ads every 6 h (:23) · Daraz+OLX 12 h (02:27 / 14:27) · Trends+News daily 03:33 · Suppliers Sundays 04:41

---

## 6. API Surface (62 routes, all under `/api`)

| Group | Routes |
|---|---|
| Auth | `register`, `login`, `logout`, `me`, `verify-email`, `resend-otp`, `forgot-password`, `reset-password`, `google/start`, `google/callback` |
| User | `user/profile`, `user/onboarding`, `user/onboarding/status`, `user/password`, `user/account`, `user/apikey`, `user/export`, `user/alerts/history` |
| Products | `products`, `products/winning`, `products/[slug]`, `products/[slug]/history`, `products/[slug]/score`, `products/[slug]/sourcing-advice` |
| Ads | `ads`, `ads/refresh`, `ads/scrape-all`, `ads/[id]/identify` |
| AI | `ai/analyze`, `ai/adcopy` |
| Trends/Local | `trends/[productId]`, `international/local`, `seasonal/events`, `seasonal/recommendations` |
| Suppliers | `suppliers`, `suppliers/add`, `suppliers/discover`, `suppliers/match`, `suppliers/scrape`, `admin/suppliers/verify` |
| TikTok | `tiktok/auth`, `tiktok/search`, `tiktok/trending` |
| Billing | `billing/checkout`, `billing/confirm`, `billing/status`, `billing/webhook` |
| Alerts | `alerts`, `alerts/[id]`, `alerts/test`, `alerts/test-whatsapp` |
| Ops | `dashboard/stats`, `stats`, `notifications`, `notifications/count`, `export/report`, `health`, `scraper/health`, `scraper/status`, `scraper/trigger`, `cron/status`, `socket/token` |

Frontend consumes **35+** of these through a single typed `api` wrapper; sockets deliver push updates.

---

## 7. Workflows

### New user journey
Landing → Register → **OTP email** → Verify → Onboarding (city/categories/platforms) →
Dashboard (live stats) → Product Hunt / City Explorer / Ad Spy → save alerts →
AI report on a product → (optional) **Upgrade to Pro** via Stripe → alerts via email/WhatsApp.

### Data pipeline
`scrapers (cron/staggered) → MongoDB → dedup & normalize → ScoreJob (hourly) →
alert match (30 min) → notifications + email/WhatsApp → Socket.io push → live UI update`

### Request flow
- **Dev**: Vite dev server (:5000) proxies `/api` + `/socket.io` → backend :3001 (no CORS pain)
- **Prod**: Render static site calls `VITE_API_URL` (set from the API service via Blueprint);
  backend CORS allow-lists `FRONTEND_URL`; sockets share the API origin.
  **API base shim in `main.jsx`** wraps `window.fetch` at boot and prefixes every same-origin
  `'/api/*'` call with `VITE_API_URL` (via `lib/baseUrl.js`), so all legacy relative `fetch`
  calls work cross-origin on the split Render deploy with zero page edits — a complete no-op
  when `VITE_API_URL` is empty (dev proxy / single-host hosts like Netlify).

### Auth flow
JWT in `Authorization: Bearer` for REST; socket handshake authenticated via short-lived
`/socket/token`; Google OAuth is a server-redirect flow ending in a token hand-off to the SPA.

---

## 8. Configuration (env)

Full reference: `backend/.env.example`. Key groups:

| Group | Vars |
|---|---|
| Required | `MONGODB_URI`, `JWT_SECRET` |
| Server | `PORT`, `NODE_ENV`, `FRONTEND_URL`, `DB_NAME`, `JWT_EXPIRES_IN`, `ADMIN_API_KEY` |
| Email | `EMAIL_USER`, `EMAIL_PASS` (Gmail app password) |
| AI | `GROQ_API_KEY`, `GROQ_VISION_MODEL` (required for Product Identifier — **no default in code**) |
| FB Ad Spy | `FB_SESSION_COOKIE` (c_user, xs, fr, sb, datr) |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| WhatsApp | `GREEN_API_INSTANCE_ID`, `GREEN_API_TOKEN` |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_SANDBOX_MODE` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (test mode: `sk_test…` / `whsec…`) |
| Tuning/flags | `SEASONAL_FILTERING`, `CONFIDENCE_THRESHOLD`, `*_ENABLED` opt-outs, Puppeteer overrides |
| Frontend | `VITE_API_URL`, `VITE_SOCKET_URL` (both empty locally — dev proxy handles it) |

---

## 9. Deployment (Render free tier)

- `render.yaml` Blueprint → `trendspy-api` (Docker, `/ping` health check, JWT auto-generated)
  + `trendspy-web` (static, `VITE_API_URL` injected from the API service)
- Dockerfile installs system **Chromium**; `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1`,
  `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`
- Free-tier tactics: keep-alive pings, 512 MB-aware scraping (media blocked, staggered jobs),
  SMTP note (free tier blocks outbound SMTP — alerts email needs a paid tier or external relay)

---

## 10. Engineering Notes & Known Gaps (honest list)

- **Winning-products pages are powered by the ads pipeline** (`adWinningService`), while the
  standalone `Products` import endpoints are not wired to the auto-scheduler (ScoreJob logs
  "Processed: 0" until products are imported — UI unaffected).
- **Dead sources removed by design**: Google Shopping (datacenter 301-block) and Shopify
  `.myshopify.com/products.json` (404s) were verified non-functional and deleted, along with
  the Global Trends/Opportunities tabs.
- FB cookie sessions can be invalidated by Facebook checkpoints → scraper degrades gracefully
  to its JSON fallback and logs `Intercepted 0`.
- TikTok runs in Sandbox tier until TikTok approves production access.
- Stripe integration is **test mode by design** (Stripe does not issue live accounts to PK
  merchants); the webhook + confirm flow is production-shaped.
- **FB ad images are CDN links that can expire** — if the vision model can't fetch the image,
  identification returns a graceful `failed` status; failures are recorded on the ad but the
  cache only short-circuits on `identified`, so the user can always retry later.
- The vision model id lives only in `GROQ_VISION_MODEL` (no code default): Groq rotates vision
  models fast (Llama-4 Scout/Maverick both shut down in 2026; the current one is `qwen/qwen3.6-27b`,
  served as Preview tier) — the operator picks explicitly and can swap without a redeploy.
- Supplier matching was **extracted** from `/api/suppliers/match` into `services/supplierMatching.js`
  (zero behavior change — the route now calls the shared function; public response shape unchanged).
- Successful identifications upsert real docs into the `Products` collection (slugified by the AI's
  product name) so sourcing advice + supplier links have a persistent home.
