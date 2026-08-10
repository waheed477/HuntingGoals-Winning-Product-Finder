# 🎨 New Design — Hunting Goals Frontend Redesign

> Documents the frontend redesign merged in commit `75282f1` ("Redesign frontend UI",
> Aug 10 2026) together with the integration fixes from `bf05362`
> ("CORS, netlify proxy, socket, OTP async"). The redesigned UI lives in [`frontend/`](frontend/).

---

## Design Language

A dark, editorial "terminal-meets-magazine" aesthetic built on four core tones:

| Token | Hex | Role |
|-------|-----|------|
| **Ink** (`--color-ink` … `ink-4`) | `#0f110a` → `#262b19` | Backgrounds, elevated surfaces, borders |
| **Bone** (`--color-bone` … `bone-3`) | `#f2eddf` → `#ded7c1` | Primary text / foreground |
| **Acid** (`--color-acid` … `acid-3`) | `#c8f542` → `#8cb91e` | Primary accent — CTAs, highlights, selection |
| **Moss / Smoke** | `#595f49` / `#a6ab97` | Muted text, secondary elements |

- `white` is deliberately re-mapped to **Bone** (`#f2eddf`, with 5–30 % alpha steps)
  and the `gray`/`slate`/`zinc` scales map onto the Ink↔Bone ramp — so existing
  utility classes automatically follow the dark theme.
- `primary`/`accent` map to the **Acid** ramp.

## Typography

| Role | Font |
|------|------|
| Display / headings | **Space Grotesk** |
| Body / UI | **Instrument Sans** |
| Data / code | **Space Mono** |

Fonts are loaded via Google Fonts in `frontend/src/index.css`.

## Motion

Bespoke keyframe animations defined in `frontend/tailwind.config.js`:
`reveal`, `pop`, `toast-in`, `floaty` (×3 staggered), `spin-slow`, `kenburns`,
`pulse-slow`, `pulse-dot`, and a `marquee` driven by `--marquee-dur` (default 32 s).

## Where Things Live

- Theme tokens (CSS custom properties + base styles) → `frontend/src/index.css`
- Tailwind palette/font/animation mapping → `frontend/tailwind.config.js`
- Light/dark preference → `frontend/src/context/ThemeContext.jsx` + `ThemeToggle` component
  (persists across sessions)
- Shell components → `Navbar`, `Sidebar`, `Layout`, `PublicLayout`, `Footer`
- Public marketing pages → `Landing`, `About`, `FAQ`, `Contact`, `PrivacyPolicy`,
  `TermsOfService`
- App pages → `Dashboard` (+ `DashboardTabs`), `ProductHunt`, `Trends`, `AdSpy`,
  `AIAnalyst`, `Seasonal`, `CityExplorer`, `TikTokTrends`, `Alerts`,
  `Notifications`, `Profile`, `SchedulerDashboard`

## Integration Changes That Shipped With the Redesign

- API client reads `import.meta.env.VITE_API_URL` (falls back to same-origin +
  Vite proxy) → `frontend/src/lib/api.js`
- Socket client reads `VITE_SOCKET_URL` → `frontend/src/hooks/useSocket.js`
- Netlify `/api/*` redirect + `VITE_*` env vars power the production build
  (see `netlify.toml` and `frontend/.env.example`)
