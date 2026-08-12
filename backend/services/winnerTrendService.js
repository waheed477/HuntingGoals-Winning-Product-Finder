/**
 * Winner Trend service — records daily score snapshots for Product Hunt winners
 * and attaches a 14-day sparkline + Rising/Cooling direction to each card.
 *
 * Winners are live aggregations (not Product docs), so the trend key is the
 * winner's display name (lowercased) + category. Snapshots are idempotent per
 * day, so repeated recording (UI refreshes + the nightly cron) is harmless.
 */

import { connectDB } from '../lib/db.js';
import WinnerSnapshot from '../models/WinnerSnapshot.js';

const TREND_DAYS      = 14;
const MOVE_THRESHOLD  = 5; // ±5 points over the week counts as a real move

export const dayKeyUTC = (d = new Date()) => d.toISOString().slice(0, 10);

/** Upsert today's point for every winner. Never throws — chart data must not break reads. */
export async function recordWinnerSnapshots(products) {
  if (!Array.isArray(products) || products.length === 0) return;
  try {
    await connectDB();
    const day = dayKeyUTC();
    const ops = products
      .filter((p) => p?.name && typeof p.winScore === 'number')
      .map((p) => ({
        updateOne: {
          filter: { key: p.name.toLowerCase(), category: p.category || null, day },
          update: {
            $set: {
              key:             p.name.toLowerCase(),
              category:        p.category || null,
              day,
              winScore:        Math.round(p.winScore),
              advertiserCount: p.advertiserCount || 0,
              totalAds:        p.totalAds || 0,
              maxDaysRunning:  p.maxDaysRunning || 0,
            },
          },
          upsert: true,
        },
      }));
    if (ops.length) await WinnerSnapshot.bulkWrite(ops, { ordered: false });
  } catch (err) {
    console.warn('[winnerTrend] snapshot record failed:', err.message);
  }
}

/** Attach trend = { points:[{d,s}], delta7, direction } to each winner (null if < 2 days of data). */
export async function attachWinnerTrends(products, days = TREND_DAYS) {
  if (!Array.isArray(products) || products.length === 0) return products;
  try {
    await connectDB();
    const cutoffDay = dayKeyUTC(new Date(Date.now() - days * 86400000));
    const keys      = [...new Set(products.map((p) => (p?.name || '').toLowerCase()).filter(Boolean))];

    const snaps = await WinnerSnapshot
      .find({ key: { $in: keys }, day: { $gte: cutoffDay } })
      .select('key day winScore')
      .lean();

    const byKey = new Map();
    for (const s of snaps) {
      if (!byKey.has(s.key)) byKey.set(s.key, []);
      byKey.get(s.key).push({ d: s.day, s: s.winScore });
    }
    for (const arr of byKey.values()) arr.sort((a, b) => a.d.localeCompare(b.d));

    const weekAgoCut = dayKeyUTC(new Date(Date.now() - 7 * 86400000));
    for (const p of products) {
      const pts = byKey.get((p?.name || '').toLowerCase()) || [];
      if (pts.length < 2) { p.trend = null; continue; } // not enough history yet — hide, don't fake

      const latest  = pts[pts.length - 1].s;
      const basePt  = [...pts].reverse().find((pt) => pt.d <= weekAgoCut) || pts[0];
      const delta7  = latest - basePt.s;
      p.trend = {
        points:    pts,
        delta7,
        direction: delta7 >= MOVE_THRESHOLD ? 'rising' : delta7 <= -MOVE_THRESHOLD ? 'cooling' : 'stable',
      };
    }
  } catch (err) {
    console.warn('[winnerTrend] attach failed:', err.message);
  }
  return products;
}

/** Nightly cron entry point: fresh winner computation → one snapshot point per winner. */
export async function snapshotCurrentWinners() {
  const { getAdBasedWinners } = await import('./adWinningService.js');
  const winners = await getAdBasedWinners(50, null, null);
  await recordWinnerSnapshots(winners);
  return winners.length;
}
