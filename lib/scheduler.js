/**
 * Scheduler
 * Initializes and starts all cron jobs.
 * Only activates when CRON_ENABLED=true.
 */

import { startScrapeJob, startTrendJob, startScoreJob, startFbAdsJob, startAlertJob, startInternationalJob, startTikTokJob, startDigestJob } from '../jobs/index.js';

let initialized = false;

export function startAllJobs() {
  if (initialized) return; // Prevent double-init in Next.js hot reload

  if (process.env.CRON_ENABLED !== 'true') {
    console.log('[Scheduler] Cron jobs disabled. Set CRON_ENABLED=true to enable.');
    return;
  }

  console.log(`[${new Date().toISOString()}] [Scheduler] Starting all cron jobs…`);

  try { startScrapeJob(); } catch (err) { console.error('[Scheduler] scrapeJob init failed:', err.message); }
  try { startTrendJob();  } catch (err) { console.error('[Scheduler] trendJob init failed:',  err.message); }
  try { startFbAdsJob();  } catch (err) { console.error('[Scheduler] fbAdsJob init failed:',  err.message); }
  try { startScoreJob();  } catch (err) { console.error('[Scheduler] scoreJob init failed:',  err.message); }
  try { startAlertJob();         } catch (err) { console.error('[Scheduler] alertJob init failed:',         err.message); }
  try { startInternationalJob(); } catch (err) { console.error('[Scheduler] internationalJob init failed:', err.message); }
  try { startTikTokJob();        } catch (err) { console.error('[Scheduler] tiktokJob init failed:',        err.message); }
  try { startDigestJob();        } catch (err) { console.error('[Scheduler] digestJob init failed:',        err.message); }

  initialized = true;
  console.log(`[${new Date().toISOString()}] [Scheduler] All cron jobs scheduled.`);
}

export default startAllJobs;
