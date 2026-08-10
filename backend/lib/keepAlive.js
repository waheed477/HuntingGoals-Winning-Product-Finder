/**
 * Keep-alive self-ping (Render free-tier anti-spin-down).
 *
 * Render's free tier sleeps a service after ~15 min without INBOUND traffic
 * on its public URL. Pinging our own public origin every ~10 minutes keeps
 * the instance (and therefore the cron jobs + Socket.io) awake 24/7.
 *
 * URL resolution (first match wins):
 *   1. KEEPALIVE_URL          — explicit override
 *   2. RENDER_EXTERNAL_URL    — Render injects this automatically
 * If neither is set (local dev), the ping is skipped silently.
 *
 * Opt out: SELF_PING_ENABLED=false
 * Tune interval: KEEPALIVE_INTERVAL_MIN (minutes, default 10)
 */

import axios from 'axios';

const INTERVAL_MIN = Math.max(parseFloat(process.env.KEEPALIVE_INTERVAL_MIN || '10'), 0.1);

let timer = null;

export function startKeepAlive() {
  if (process.env.SELF_PING_ENABLED === 'false') {
    console.log('[KeepAlive] Self-ping disabled via SELF_PING_ENABLED=false.');
    return;
  }

  const base = process.env.KEEPALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!base) {
    console.log('[KeepAlive] No public URL set (RENDER_EXTERNAL_URL/KEEPALIVE_URL) — self-ping skipped (normal for local dev).');
    return;
  }

  const url = `${base.replace(/\/+$/, '')}/ping`;

  const fire = async () => {
    try {
      await axios.get(url, { timeout: 10_000 });
      console.log(`[KeepAlive] pinged ${url}`);
    } catch (err) {
      console.warn(`[KeepAlive] ping failed: ${err.message}`);
    }
  };

  setTimeout(fire, 30_000);                    // first ping 30s after boot
  timer = setInterval(fire, INTERVAL_MIN * 60_000);
  timer.unref?.();

  console.log(`[KeepAlive] ✅ Self-ping every ${INTERVAL_MIN} min → ${url}`);
}
