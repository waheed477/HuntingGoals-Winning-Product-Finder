import mongoose from 'mongoose';
import slugify from 'slugify';

const seasonalEventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    // When sellers should start preparing stock (typically 2-3 weeks before startDate)
    preparationStartDate: { type: Date, default: null },
    year: {
      type: Number,
      required: [true, 'Year is required'],
    },
    isActive: { type: Boolean, default: true },
    // e.g. { "Fashion": 40, "Electronics": 20 } — percentage boost per category
    categoryBoost: {
      type: Map,
      of: Number,
      default: {},
    },
    // Historically winning products during this season
    typicalWinningProducts: [
      {
        productName: { type: String, required: true },
        category: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

// Indexes
seasonalEventSchema.index({ startDate: 1, endDate: 1 });
seasonalEventSchema.index({ year: 1, name: 1 }, { unique: true });
seasonalEventSchema.index({ isActive: 1 });

// Auto-generate slug from name
seasonalEventSchema.pre('validate', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Static: find the currently active season (today falls between startDate and endDate)
seasonalEventSchema.statics.findCurrentSeason = function () {
  const now = new Date();
  return this.find({
    startDate: { $lte: now },
    endDate: { $gte: now },
    isActive: true,
  });
};

// Static: find seasons starting within the next N days
seasonalEventSchema.statics.findUpcomingSeasons = function (days = 30) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);
  return this.find({
    startDate: { $gte: now, $lte: future },
    isActive: true,
  }).sort({ startDate: 1 });
};

// Static: find seasons where today falls in the preparation window
seasonalEventSchema.statics.getPreparationProducts = function () {
  const now = new Date();
  return this.find({
    preparationStartDate: { $lte: now },
    startDate: { $gte: now },
    isActive: true,
  }).sort({ startDate: 1 });
};

const SeasonalEvent =
  mongoose.models.SeasonalEvent || mongoose.model('SeasonalEvent', seasonalEventSchema);
export default SeasonalEvent;
