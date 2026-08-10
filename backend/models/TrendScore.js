import mongoose from 'mongoose';

const trendScoreSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true,
    },
    productSlug: {
      type: String,
      required: [true, 'Product slug is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true,
    },
    // Normalized search volume score (0-100)
    searchVolume: { type: Number, min: 0, max: 100, default: 0 },
    city: {
      type: String,
      default: null, // null = national aggregate
      index: true,
    },
    category: { type: String, default: null, index: true },
    dailyScore: { type: Number, min: 0, max: 100, default: 0 },
    weekOverWeekChange: { type: Number, default: 0 }, // % change vs previous week
    monthOverMonthChange: { type: Number, default: 0 }, // % change vs previous month
  },
  { timestamps: true }
);

// Unique compound index to allow safe upsert operations
trendScoreSchema.index({ productId: 1, date: 1, city: 1 }, { unique: true });

// Static: get trend history for a product over N days, optionally filtered by city
trendScoreSchema.statics.getTrends = function (productId, days = 30, city = null) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const query = {
    productId,
    date: { $gte: since },
  };
  if (city) query.city = city;

  return this.find(query).sort({ date: 1 });
};

// Static: compare trend scores for two cities over a shared category
trendScoreSchema.statics.getCityComparison = function (city1, city2, category, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return this.find({
    city: { $in: [city1, city2] },
    category,
    date: { $gte: since },
  }).sort({ date: 1 });
};

const TrendScore =
  mongoose.models.TrendScore || mongoose.model('TrendScore', trendScoreSchema);
export default TrendScore;
