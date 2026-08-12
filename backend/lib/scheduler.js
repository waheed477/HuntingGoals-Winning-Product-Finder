/**
 * Scheduler
 * Initializes and starts all 9 cron jobs.
 *
 * Jobs run by default (restored for the Render deployment — they were gated
 * off for the old constrained free-tier host). Set CRON_ENABLED=false to
 * explicitly opt out (e.g. for a local frontend-only dev session).
 */

import {
  startScrapeJob,
  startTrendJob,
  startScoreJob,
  startFbAdsJob,
  startAlertJob,
  startCompetitorJob,
  startAutoCorrectJob,
  startTikTokJob,
  startDigestJob,
  startSnapshotJob,
  startDarazJob,
  startArchiveJob,
} from '../jobs/index.js';

let initialized = false;

export function startAllJobs() {
  if (initialized) return; // Prevent double-init in Next.js hot reload

  if (process.env.CRON_ENABLED === 'false') {
    console.log('[Scheduler] Cron jobs disabled via CRON_ENABLED=false.');
    return;
  }

  console.log(`[${new Date().toISOString()}] [Scheduler] Starting all cron jobs…`);

  try { startScrapeJob(); }        catch (err) { console.error('[Scheduler] scrapeJob init failed:',        err.message); }
  try { startTrendJob(); }         catch (err) { console.error('[Scheduler] trendJob init failed:',         err.message); }
  try { startFbAdsJob(); }         catch (err) { console.error('[Scheduler] fbAdsJob init failed:',         err.message); }
  try { startScoreJob(); }         catch (err) { console.error('[Scheduler] scoreJob init failed:',         err.message); }
  try { startAlertJob(); }         catch (err) { console.error('[Scheduler] alertJob init failed:',         err.message); }
  try { startCompetitorJob(); }    catch (err) { console.error('[Scheduler] competitorJob init failed:',    err.message); }
  try { startAutoCorrectJob(); }   catch (err) { console.error('[Scheduler] autoCorrectJob init failed:',   err.message); }
  try { startTikTokJob(); }        catch (err) { console.error('[Scheduler] tiktokJob init failed:',        err.message); }
  try { startDigestJob(); }        catch (err) { console.error('[Scheduler] digestJob init failed:',        err.message); }
  try { startSnapshotJob(); }      catch (err) { console.error('[Scheduler] snapshotJob init failed:',      err.message); }
  try { startDarazJob(); }         catch (err) { console.error('[Scheduler] darazJob init failed:',         err.message); }
  try { startArchiveJob(); }       catch (err) { console.error('[Scheduler] archiveJob init failed:',       err.message); }

  initialized = true;
  console.log(`[${new Date().toISOString()}] [Scheduler] All cron jobs scheduled.`);
}

export default startAllJobs;
