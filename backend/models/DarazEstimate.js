import mongoose from 'mongoose';

/**
 * DarazEstimate — demand + price signals for a winning product, scraped from
 * Daraz.pk search results (public data, refreshed by a throttled cron).
 * review→order estimate uses the industry rule of thumb (~2–5% of buyers
 * review); deliberately labelled an estimate, never exact sales.
 */
const darazEstimateSchema = new mongoose.Schema({
  key:           { type: String, required: true },  // winner name, lowercased
  category:      { type: String, default: null },
  estOrders:     { type: Number, default: 0 },      // lifetime order estimate (reviews × 45)
  totalReviews:  { type: Number, default: 0 },
  listingCount:  { type: Number, default: 0 },
  avgPrice:      { type: Number, default: 0 },      // PKR
  medianPrice:   { type: Number, default: 0 },      // PKR
  topRating:     { type: Number, default: 0 },
  demandLevel:   { type: String, enum: ['high', 'medium', 'low', 'emerging', 'untapped', null], default: null },
  query:         { type: String, default: '' },     // search term actually used (audit)
  checkedAt:     { type: Date, default: Date.now },
});

darazEstimateSchema.index({ key: 1, category: 1 }, { unique: true });
darazEstimateSchema.index({ checkedAt: -1 });

export default mongoose.models.DarazEstimate ||
  mongoose.model('DarazEstimate', darazEstimateSchema);
