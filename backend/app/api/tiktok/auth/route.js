/**
 * POST /api/tiktok/auth  — force-refresh the TikTok access token
 * GET  /api/tiktok/auth  — return current token status (no secret values exposed)
 *
 * Both endpoints are admin-only (require X-Admin-Key header).
 */

import { fetchAccessToken, getTokenStatus } from '@/services/tiktokOfficialService';

function isAdmin(request) {
  const key = request.headers.get('x-admin-key');
  return key && key === process.env.ADMIN_API_KEY;
}

// GET — token status
export async function GET(request) {
  if (!isAdmin(request)) {
    return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const status = getTokenStatus();
  return Response.json({ success: true, ...status });
}

// POST — force token refresh
export async function POST(request) {
  if (!isAdmin(request)) {
    return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { expiresIn } = await fetchAccessToken();
    return Response.json({
      success:      true,
      message:      'Access token refreshed successfully.',
      expiresIn,
      sandboxMode:  process.env.TIKTOK_SANDBOX_MODE !== 'false',
    });
  } catch (err) {
    console.error('[POST /api/tiktok/auth]', err.message);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
