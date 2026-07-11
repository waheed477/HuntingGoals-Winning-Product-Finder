/**
 * GET /api/cron/status
 * Returns current cron job configuration and server health.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    cronEnabled: process.env.CRON_ENABLED === 'true',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    jobs: {
      scrapeJob:  { schedule: '0 */6 * * *',  description: 'Daraz + OLX + TikTok (every 6h)' },
      trendJob:   { schedule: '0 */12 * * *', description: 'Google Trends + News (every 12h)' },
      fbAdsJob:   { schedule: '0 */12 * * *', description: 'Facebook Ads (every 12h)' },
      scoreJob:   { schedule: '0 * * * *',    description: 'Win Score update (every 1h)' },
    },
  });
}
