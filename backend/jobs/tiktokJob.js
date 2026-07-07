/**
 * TikTok Job — daily cron at 4 AM Pakistan time
 * Fetches trending Pakistan TikTok signals via Official API,
 * updates Product metrics in MongoDB, and broadcasts via socket.
 */

import cron    from 'node-cron';
import axios   from 'axios';
import { connectDB }                       from '../lib/db.js';
import { Product }                          from '../models/index.js';
import { fetchPakistanTrendingSignals }     from '../services/tiktokOfficialService.js';

const SCHEDULE       = '0 4 * * *'; // Every day at 4:00 AM PKT
const NEXT_API       = process.env.NEXT_INTERNAL_URL       || 'http://localhost:3001';
const SOCKET_SECRET  = process.env.SOCKET_INTERNAL_SECRET  || 'trendspy-socket-internal';
const SOCKET_BASE    = process.env.SOCKET_INTERNAL_URL     || 'http://localhost:3002';

// ─── Core Job Logic ───────────────────────────────────────────────────────────

export async function runTikTokJob() {
  const startedAt = new Date();
  console.log(`[${startedAt.toISOString()}] [TikTokJob] Starting daily TikTok fetch…`);

  let productsUpdated = 0;
  let totalViews      = 0;
  let errors          = 0;

  try {
    await connectDB();

    // 1. Fetch trending signals from the Official API
    const { videos, totalViews: views, hashtagStats } = await fetchPakistanTrendingSignals();
    totalViews = views;

    console.log(`[TikTokJob] Fetched ${videos.length} videos, ${totalViews.toLocaleString()} total views`);

    // 2. Extract product signals and update MongoDB
    const PRODUCT_KEYWORDS = ['buy', 'order', 'price', 'sale', 'discount', 'deal', 'pkr', 'rs.', 'daraz', 'olx'];
    const seen = new Set();

    for (const video of videos) {
      const desc  = (video.description || '').toLowerCase();
      const hasKw = PRODUCT_KEYWORDS.some((kw) => desc.includes(kw));
      if (!hasKw) continue;

      const hashtags = (video.hashtags || []).filter(
        (h) => h.length > 3 && !['pakistan', 'fyp', 'foryou', 'viral', 'tiktok'].includes(h.toLowerCase())
      );

      for (const tag of hashtags) {
        if (seen.has(tag)) continue;
        seen.add(tag);

        try {
          const result = await Product.findOneAndUpdate(
            { name: { $regex: tag.replace(/_/g, ' '), $options: 'i' } },
            {
              $inc: {
                tiktokViews:         video.viewCount  || 0,
                tiktokHashtagVolume: video.shareCount || 0,
              },
              $set: {
                lastScrapedAt: new Date(),
              },
              $addToSet: { platforms: 'tiktok' },
            },
            { new: true }
          );

          if (result) {
            if (typeof result.updateWinScore === 'function') result.updateWinScore();
            await result.save();
            productsUpdated++;
          }
        } catch (err) {
          errors++;
          console.warn(`[TikTokJob] DB update failed for "${tag}": ${err.message}`);
        }
      }
    }

    // 3. Broadcast results via socket server
    try {
      await axios.post(
        `${SOCKET_BASE}/internal/emit`,
        {
          event: 'tiktokJobComplete',
          data:  {
            videosProcessed: videos.length,
            totalViews,
            productsUpdated,
            hashtagStats,
            completedAt: new Date().toISOString(),
          },
        },
        {
          headers: { 'x-internal-secret': SOCKET_SECRET },
          timeout: 5000,
        }
      );
    } catch {
      // Socket broadcast is best-effort — don't fail the job
    }

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(
      `[TikTokJob] ✅ Done in ${elapsed}s — ` +
      `videos=${videos.length}, views=${totalViews.toLocaleString()}, ` +
      `productsUpdated=${productsUpdated}, errors=${errors}`
    );

    return { success: true, videosProcessed: videos.length, totalViews, productsUpdated, errors };

  } catch (err) {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.error(`[TikTokJob] ❌ Failed after ${elapsed}s: ${err.message}`);
    return { success: false, error: err.message, productsUpdated, errors };
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

export function startTikTokJob() {
  console.log(`[TikTokJob] Scheduled: ${SCHEDULE} (daily at 4 AM PKT)`);
  cron.schedule(SCHEDULE, runTikTokJob, { timezone: 'Asia/Karachi' });
}
