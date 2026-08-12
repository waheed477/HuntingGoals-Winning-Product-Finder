import mongoose from 'mongoose';

/**
 * WinnerSnapshot — one tiny score point per winning product per day.
 * Powers the 14-day score sparkline + Rising/Cooling badges on Product Hunt.
 * Keyed by the winner's display name (lowercased) + category + UTC day.
 */
const winnerSnapshotSchema = new mongoose.Schema({
  key:             { type: String, required: true },   // winner name, lowercased
  category:        { type: String, default: null },
  winScore:        { type: Number, required: true },
  advertiserCount: { type: Number, default: 0 },
  totalAds:        { type: Number, default: 0 },
  maxDaysRunning:  { type: Number, default: 0 },
  day:             { type: String, required: true },   // 'YYYY-MM-DD' (UTC)
});

winnerSnapshotSchema.index({ key: 1, category: 1, day: 1 }, { unique: true });
winnerSnapshotSchema.index({ day: -1 });

export default mongoose.models.WinnerSnapshot ||
  mongoose.model('WinnerSnapshot', winnerSnapshotSchema);
