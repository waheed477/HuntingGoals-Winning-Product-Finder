const VALID_SCRAPERS = ['facebookAds', 'daraz', 'olx', 'googleTrends', 'news', 'suppliers'];

export async function POST(request) {
  try {
    const body    = await request.json().catch(() => ({}));
    const scraper = body.scraper || 'facebookAds';

    if (!VALID_SCRAPERS.includes(scraper)) {
      return Response.json({
        success: false,
        error:   `Unknown scraper. Valid options: ${VALID_SCRAPERS.join(', ')}`,
      }, { status: 400 });
    }

    const scheduler = globalThis.__trendspyScheduler;
    if (!scheduler) {
      return Response.json({ success: false, error: 'Scheduler not initialized yet' }, { status: 503 });
    }

    // Triggers run fire-and-forget in-process (same semantics as the old
    // socket-server /internal/run-fb-job and /scheduler/trigger endpoints).
    scheduler.trigger(scraper);

    return Response.json({ success: true, message: `${scraper} job triggered` });
  } catch (err) {
    console.error('[POST /api/scraper/trigger]', err.message);
    return Response.json({ success: false, error: err.message }, { status: 502 });
  }
}
