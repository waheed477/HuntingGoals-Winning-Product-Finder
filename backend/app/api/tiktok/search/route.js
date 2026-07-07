/**
 * POST /api/tiktok/search
 * Search TikTok videos by keyword or hashtag.
 * Protected (JWT).
 *
 * Body: { query?: string, hashtag?: string, limit?: number }
 *
 * Returns videos with engagement metrics useful for product hunting.
 */

import { withAuth }    from '@/middleware/auth';
import { searchVideos } from '@/services/tiktokOfficialService';

export const POST = withAuth(async (request, _context, _user) => {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { query, hashtag, limit = 20 } = body;

  if (!query && !hashtag) {
    return Response.json(
      { success: false, error: 'Provide at least one of: query, hashtag' },
      { status: 400 }
    );
  }

  const clampedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

  try {
    const videos = await searchVideos({ query, hashtag, limit: clampedLimit });

    // Summarise engagement metrics
    const totalViews    = videos.reduce((s, v) => s + (v.viewCount    || 0), 0);
    const totalLikes    = videos.reduce((s, v) => s + (v.likeCount    || 0), 0);
    const totalShares   = videos.reduce((s, v) => s + (v.shareCount   || 0), 0);
    const totalComments = videos.reduce((s, v) => s + (v.commentCount || 0), 0);
    const avgViews      = videos.length ? Math.round(totalViews / videos.length) : 0;

    // Collect unique hashtags from results (good for product signal mining)
    const relatedHashtags = [
      ...new Set(videos.flatMap((v) => v.hashtags || []))
    ]
      .filter((h) => h && h.length > 2)
      .slice(0, 20);

    return Response.json({
      success: true,
      query:   query || null,
      hashtag: hashtag || null,
      count:   videos.length,
      metrics: { totalViews, totalLikes, totalShares, totalComments, avgViews },
      relatedHashtags,
      videos,
      sandbox: process.env.TIKTOK_SANDBOX_MODE !== 'false',
    });
  } catch (err) {
    console.error('[POST /api/tiktok/search]', err.message);

    if (err.message.includes('CLIENT_KEY') || err.message.includes('token')) {
      return Response.json(
        { success: false, error: 'TikTok API not configured. Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in secrets.' },
        { status: 503 }
      );
    }

    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});
