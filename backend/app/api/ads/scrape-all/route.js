/**
 * POST /api/ads/scrape-all — start the full FB Ads scrape cycle in the
 * background (previously delegated to the standalone socket server; now
 * runs in-process via the auto-scraper registry).
 */
export async function POST() {
  try {
    const scheduler = globalThis.__trendspyScheduler;
    if (!scheduler) {
      return Response.json({ success: false, error: 'Scheduler not initialized yet' }, { status: 503 });
    }

    // Fire-and-forget — returns immediately, job runs in background
    scheduler.runFacebookAdsJob();

    return Response.json({ success: true, message: 'Scrape job started' });
  } catch (err) {
    console.error('[POST /api/ads/scrape-all]', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
