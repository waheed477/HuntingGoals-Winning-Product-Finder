/**
 * TikTok Official API Service
 * Uses OAuth 2.0 Client Credentials to authenticate and fetch
 * trending/searched videos for the Pakistan market.
 *
 * Sandbox mode: active when TIKTOK_SANDBOX_MODE=true
 * Token auto-refreshes after expiry (24h default).
 */

import axios from 'axios';

const BASE_URL     = 'https://open.tiktokapis.com/v2';
const TOKEN_URL    = 'https://open.tiktokapis.com/v2/oauth/token/';
const SANDBOX_MODE = process.env.TIKTOK_SANDBOX_MODE !== 'false';

// In-memory token cache — survives the process lifetime
let _tokenCache = {
  accessToken: process.env.TIKTOK_ACCESS_TOKEN || null,
  expiresAt:   0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCredentials() {
  const clientKey    = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    throw new Error('TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET must be set in Replit Secrets.');
  }
  return { clientKey, clientSecret };
}

function isTokenValid() {
  return _tokenCache.accessToken && Date.now() < _tokenCache.expiresAt - 60_000;
}

// ─── Token Management ─────────────────────────────────────────────────────────

/**
 * Fetch a new Client Credentials access token from TikTok.
 * @returns {Promise<{ accessToken: string, expiresIn: number }>}
 */
export async function fetchAccessToken() {
  const { clientKey, clientSecret } = getCredentials();

  const params = new URLSearchParams({
    client_key:    clientKey,
    client_secret: clientSecret,
    grant_type:    'client_credentials',
  });

  const res = await axios.post(TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });

  const data = res.data;

  if (data.error && data.error !== 'ok') {
    throw new Error(`TikTok token error: ${data.error} — ${data.error_description || ''}`);
  }

  const accessToken = data.access_token;
  const expiresIn   = data.expires_in || 86400; // Default 24 hours

  _tokenCache = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  console.log(`[TikTok] ✅ Access token obtained. Expires in ${expiresIn}s (sandbox=${SANDBOX_MODE})`);
  return { accessToken, expiresIn };
}

/**
 * Return a valid access token, refreshing automatically if expired.
 * @returns {Promise<string>}
 */
export async function getValidToken() {
  if (!isTokenValid()) {
    await fetchAccessToken();
  }
  return _tokenCache.accessToken;
}

/**
 * Return current token status (existence + expiry) without leaking the value.
 */
export function getTokenStatus() {
  const hasToken = !!_tokenCache.accessToken;
  const expiresIn = hasToken ? Math.max(0, Math.floor((_tokenCache.expiresAt - Date.now()) / 1000)) : 0;
  return {
    hasToken,
    sandboxMode: SANDBOX_MODE,
    expiresIn,
    expiresAt: hasToken ? new Date(_tokenCache.expiresAt).toISOString() : null,
  };
}

// ─── Authenticated API Call ───────────────────────────────────────────────────

async function apiCall(method, path, data = null, params = {}) {
  const token = await getValidToken();

  const config = {
    method,
    url: `${BASE_URL}${path}`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    params,
    timeout: 20000,
  };
  if (data) config.data = data;

  const res = await axios(config);

  const body = res.data;
  if (body?.error?.code && body.error.code !== 'ok') {
    throw new Error(`TikTok API error [${body.error.code}]: ${body.error.message || ''}`);
  }

  return body?.data || body;
}

// ─── Pakistan Trending Videos ─────────────────────────────────────────────────

const PK_HASHTAGS = [
  'pakistanshopping',
  'darazpakistan',
  'trendingproducts',
  'onlineshopping',
  'shoponline',
];

const PK_CATEGORIES = [
  'Electronics', 'Fashion', 'Beauty', 'Home & Garden', 'Sports',
];

/**
 * Fetch trending videos in Pakistan via Research API.
 * Falls back to hashtag-based search if Research API unavailable.
 * @param {Object} opts
 * @param {string} [opts.category]
 * @param {number} [opts.limit=20]
 * @returns {Promise<Array>}
 */
export async function getTrendingVideos({ category, limit = 20 } = {}) {
  try {
    // Research API — video query with Pakistan region filter
    const query = {
      and: [
        { operation: 'IN', field_name: 'region_code', field_values: ['PK'] },
      ],
    };

    if (category) {
      query.and.push({
        operation: 'IN',
        field_name: 'hashtag_name',
        field_values: [category.toLowerCase().replace(/\s+/g, ''), 'pakistan'],
      });
    }

    const result = await apiCall('POST', '/research/video/query/', {
      query,
      start_date: formatDate(daysAgo(7)),
      end_date:   formatDate(new Date()),
      max_count:  Math.min(limit, 100),
      fields:     VIDEO_FIELDS,
    });

    const videos = result?.videos || [];
    console.log(`[TikTok] Trending fetch: ${videos.length} videos`);
    return videos.map(normalizeVideo);

  } catch (err) {
    console.warn(`[TikTok] Research API unavailable (${err.message}), falling back to hashtag search`);
    return searchByHashtag(category ? category.toLowerCase().replace(/\s+/g, '') : 'pakistanshopping', limit);
  }
}

// ─── Hashtag/Keyword Search ───────────────────────────────────────────────────

/**
 * Search videos by keyword or hashtag.
 * @param {Object} opts
 * @param {string} [opts.query]
 * @param {string} [opts.hashtag]
 * @param {number} [opts.limit=20]
 * @returns {Promise<Array>}
 */
export async function searchVideos({ query: keyword, hashtag, limit = 20 } = {}) {
  const term = hashtag || keyword || 'pakistan shopping';

  try {
    // Try Research API keyword search first
    const result = await apiCall('POST', '/research/video/query/', {
      query: {
        and: [
          { operation: 'IN', field_name: 'region_code', field_values: ['PK'] },
          { operation: 'EQ', field_name: 'keyword',     field_values: [term] },
        ],
      },
      start_date: formatDate(daysAgo(14)),
      end_date:   formatDate(new Date()),
      max_count:  Math.min(limit, 100),
      fields:     VIDEO_FIELDS,
    });

    const videos = result?.videos || [];
    console.log(`[TikTok] Search "${term}": ${videos.length} videos`);
    return videos.map(normalizeVideo);

  } catch (err) {
    console.warn(`[TikTok] Keyword search failed (${err.message}), trying hashtag endpoint`);
    return searchByHashtag(term.replace(/\s+/g, ''), limit);
  }
}

/**
 * Fallback: fetch videos for a specific hashtag using the hashtag endpoint.
 */
async function searchByHashtag(hashtag, limit = 20) {
  try {
    const result = await apiCall('GET', '/research/hashtag/query/', null, {
      hashtag_name: hashtag,
      fields:       'id,create_time,username,like_count,comment_count,share_count,view_count,hashtag_names,video_description',
      max_count:    Math.min(limit, 100),
    });
    const videos = result?.videos || result?.hashtag_videos || [];
    return videos.map(normalizeVideo);
  } catch (err) {
    console.warn(`[TikTok] Hashtag endpoint also failed: ${err.message}`);
    return [];
  }
}

// ─── Hashtag Volume ───────────────────────────────────────────────────────────

/**
 * Fetch view count for a hashtag (proxy for "volume").
 * @param {string} hashtag - without the # prefix
 * @returns {Promise<{ hashtag: string, viewCount: number, videoCount: number }>}
 */
export async function getHashtagStats(hashtag) {
  try {
    const result = await apiCall('GET', '/research/hashtag/query/', null, {
      hashtag_name: hashtag,
      fields:       'id,view_count,video_count',
    });

    return {
      hashtag,
      viewCount:  result?.view_count  || 0,
      videoCount: result?.video_count || 0,
    };
  } catch (err) {
    console.warn(`[TikTok] Hashtag stats failed for "${hashtag}": ${err.message}`);
    return { hashtag, viewCount: 0, videoCount: 0 };
  }
}

// ─── Bulk Pakistan product signals ────────────────────────────────────────────

/**
 * Fetch aggregated TikTok signals for all PK shopping hashtags.
 * Used by the daily cron job.
 * @returns {Promise<{ videos: Array, totalViews: number, hashtagStats: Array }>}
 */
export async function fetchPakistanTrendingSignals() {
  const allVideos = [];
  const hashtagStats = [];

  for (const tag of PK_HASHTAGS) {
    try {
      const [videos, stats] = await Promise.all([
        searchVideos({ hashtag: tag, limit: 30 }),
        getHashtagStats(tag),
      ]);
      allVideos.push(...videos);
      hashtagStats.push(stats);
    } catch (err) {
      console.warn(`[TikTok] Signal fetch failed for #${tag}: ${err.message}`);
    }
    await delay(1500);
  }

  const totalViews = allVideos.reduce((sum, v) => sum + (v.viewCount || 0), 0);
  return { videos: dedupe(allVideos), totalViews, hashtagStats };
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

const VIDEO_FIELDS = 'id,create_time,username,like_count,comment_count,share_count,view_count,hashtag_names,video_description,music_id,region_code,voice_to_text';

function normalizeVideo(raw) {
  const videoId = raw.id || raw.video_id || '';
  const author  = raw.username || raw.author || '';
  return {
    videoId,
    author,
    description:  raw.video_description || raw.desc || '',
    viewCount:    raw.view_count  || raw.playCount  || 0,
    likeCount:    raw.like_count  || raw.diggCount  || 0,
    commentCount: raw.comment_count || 0,
    shareCount:   raw.share_count || 0,
    hashtags:     raw.hashtag_names || [],
    createdAt:    raw.create_time ? new Date(raw.create_time * 1000).toISOString() : null,
    regionCode:   raw.region_code || 'PK',
    // Use the resolved videoId (not the raw field name) so links are never null
    url: videoId && author ? `https://www.tiktok.com/@${author}/video/${videoId}` : null,
  };
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatDate(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function dedupe(videos) {
  const seen = new Set();
  return videos.filter((v) => {
    if (!v.videoId || seen.has(v.videoId)) return false;
    seen.add(v.videoId);
    return true;
  });
}

export default {
  fetchAccessToken,
  getValidToken,
  getTokenStatus,
  getTrendingVideos,
  searchVideos,
  getHashtagStats,
  fetchPakistanTrendingSignals,
};
