// force-dynamic: without this, next build PRERENDERS GET handlers inside Docker
// (no MONGODB_URI at build time) and the frozen fallback response is served forever.
export const dynamic = 'force-dynamic';

import { getScraperStatus } from '@/services/scraperService';

export async function GET() {
  try {
    const status = await getScraperStatus();

    return Response.json({
      success: true,
      status,
    });
  } catch (err) {
    console.error('[GET /api/scraper/health]', err.message);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
