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
