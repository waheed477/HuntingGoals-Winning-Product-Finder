import cron from 'node-cron';
import { snapshotCurrentWinners } from '../services/winnerTrendService.js';

// One score point per winner per day — guarantees the sparkline keeps growing
// even on days nobody opens the Product Hunt tab.
export function startSnapshotJob() {
  cron.schedule('58 23 * * *', async () => {
    try {
      const n = await snapshotCurrentWinners();
      console.log(`[SnapshotJob] Recorded score snapshots for ${n} winner(s).`);
    } catch (err) {
      console.error('[SnapshotJob] failed:', err.message);
    }
  });

  console.log('[SnapshotJob] Scheduled: daily 23:58');
}
