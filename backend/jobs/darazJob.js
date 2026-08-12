import cron from 'node-cron';
import { refreshDarazEstimates } from '../services/darazEstimateService.js';

// Refreshes Daraz demand/price estimates for stale winners.
// 03:30 daily + a light 15:30 top-up — heavily throttled inside the service
// (≤25 products/run, 1.5–2.5s between requests), well under Daraz tolerance.
export function startDarazJob() {
  const run = async (tag) => {
    try {
      const r = await refreshDarazEstimates();
      console.log(`[DarazJob] ${tag} done — refreshed: ${r.refreshed}, skipped: ${r.skipped}, failed: ${r.failed}`);
    } catch (err) {
      console.error('[DarazJob] failed:', err.message);
    }
  };

  cron.schedule('30 3 * * *',  () => run('daily'));
  cron.schedule('30 15 * * *', () => run('topup'));

  console.log('[DarazJob] Scheduled: 03:30 + 15:30 daily (throttled)');
}
