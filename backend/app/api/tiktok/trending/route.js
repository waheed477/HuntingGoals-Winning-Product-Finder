/**
 * GET /api/tiktok/trending
 * Returns trending TikTok videos in Pakistan.
 * Protected (JWT). Rate limited: 50 requests/hour per user.
 *
 * Query params:
 *   category  — optional filter (Electronics, Fashion, etc.)
 *   limit     — number of videos to return (default 20, max 50)
 */

import { withAuth }         from '@/middleware/auth';
import { getTrendingVideos } from '@/services/tiktokOfficialService';

// In-memory rate limiter: userId → { count, windowStart }
const rateLimits = new Map();
const WINDOW_MS  = 60 * 60 * 1000; // 1 hour
const MAX_REQ    = 50;

function checkRateLimit(userId) {
  const now    = Date.now();
  const record = rateLimits.get(userId);

  if (!record || now - record.windowStart > WINDOW_MS) {
    rateLimits.set(userId, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_REQ - 1 };
  }

  if (record.count >= MAX_REQ) {
    const resetIn = Math.ceil((record.windowStart + WINDOW_MS - now) / 1000);
    return { allowed: false, remaining: 0, resetIn };
  }

  record.count++;
  return { allowed: true, remaining: MAX_REQ - record.count };
}

export const GET = withAuth(async (request, _context, user) => {
  const rl = checkRateLimit(String(user._id));
  if (!rl.allowed) {
    return Response.json(
      { success: false, error: `Rate limit exceeded. Try again in ${rl.resetIn}s.` },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    );
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const limit    = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  try {
    const videos = await getTrendingVideos({ category, limit });

    return Response.json(
      {
        success: true,
        count:   videos.length,
        category: category || 'all',
        videos,
        sandbox: process.env.TIKTOK_SANDBOX_MODE !== 'false',
        rateLimit: { remaining: rl.remaining, windowHours: 1 },
      },
      { headers: { 'X-RateLimit-Remaining': String(rl.remaining) } }
    );
  } catch (err) {
    console.error('[GET /api/tiktok/trending]', err.message);

    // Surface token config errors clearly
    if (err.message.includes('CLIENT_KEY') || err.message.includes('token')) {
      return Response.json(
        { success: false, error: 'TikTok API not configured. Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in secrets.' },
        { status: 503 }
      );
    }

    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});
