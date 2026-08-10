import mongoose from 'mongoose';

const VALID_SEASONS = ['winter', 'summer', 'ramadan', 'wedding', 'backToSchool', 'general'];

const scrapedAdSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    productName: {
      type: String,
      trim: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['facebook', 'instagram', 'tiktok'],
      required: [true, 'Platform is required'],
    },
    adId: {
      type: String,
      required: [true, 'Ad ID is required'],
      unique: true,
    },
    headline:    { type: String, default: '' },
    description: { type: String, default: '' },
    creativeType: {
      type: String,
      enum: ['image', 'video', 'carousel'],
      default: 'image',
    },
    imageUrl:       { type: String, default: null },
    videoUrl:       { type: String, default: null },
    advertiserName: { type: String, default: '' },
    advertiserPage: { type: String, default: '' },
    daysRunning:    { type: Number, default: 0 },
    spendLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    city:      { type: String, default: null, index: true },
    category:  { type: String, default: null },
    season: {
      type: String,
      enum: VALID_SEASONS,
      default: 'general',
      index: true,
    },
    scrapedAt: { type: Date, default: Date.now, index: true },
    isActive:  { type: Boolean, default: true },
    directUrl: { type: String, default: null },
  },
  { timestamps: true }
);

scrapedAdSchema.index({ platform: 1, productName: 1 });
scrapedAdSchema.index({ daysRunning: -1 });
scrapedAdSchema.index({ city: 1, category: 1, scrapedAt: -1 });
scrapedAdSchema.index({ season: 1, category: 1, scrapedAt: -1 });

const ScrapedAd = mongoose.models.ScrapedAd || mongoose.model('ScrapedAd', scrapedAdSchema);
export default ScrapedAd;
