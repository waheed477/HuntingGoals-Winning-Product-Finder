/**
 * Score Job — runs every 1 hour
 * Recalculates Win Scores for all products.
 * Emits real-time socket events for new winners and batch summaries.
 */

import cron from 'node-cron';
import { updateAllWinScores } from '../services/winScoreService.js';
import { emitScoreBatchUpdate } from '../lib/socketEmitter.js';

const SCHEDULE = '0 * * * *'; // Every hour

async function runScoreJob() {
  const start = new Date();
  console.log(`[${start.toISOString()}] [ScoreJob] Recalculating Win Scores…`);

  try {
    const { processed, updated, winners, newWinners } = await updateAllWinScores();

    console.log(
      `[${new Date().toISOString()}] [ScoreJob] Done. Processed: ${processed}, Updated: ${updated}`
    );
    console.log(`[ScoreJob] Found ${winners} products with winScore >= 75`);

    // Broadcast batch summary to all connected clients
    await emitScoreBatchUpdate({
      count:      updated,
      winners,
      newWinners: newWinners.map((p) => ({
        _id:      p._id,
        name:     p.name,
        slug:     p.slug,
        winScore: p.winScore,
        category: p.category,
      })),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [ScoreJob] FAILED: ${err.message}`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[${new Date().toISOString()}] [ScoreJob] Cycle complete in ${elapsed}s`);
}

export function startScoreJob() {
  console.log(`[ScoreJob] Scheduled: ${SCHEDULE} (every 1 hour)`);
  cron.schedule(SCHEDULE, runScoreJob, { timezone: 'Asia/Karachi' });
}

export { runScoreJob };
