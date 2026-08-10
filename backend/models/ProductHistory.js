import mongoose from 'mongoose';

const productHistorySchema = new mongoose.Schema({
  productId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  productSlug:     { type: String, required: true, index: true },
  winScore:        { type: Number, required: true },
  advertiserCount: { type: Number, default: 0 },
  totalAds:        { type: Number, default: 0 },
  maxDaysRunning:  { type: Number, default: 0 },
  recordedAt:      { type: Date, default: Date.now, index: true },
});

productHistorySchema.index({ productSlug: 1, recordedAt: -1 });

export default mongoose.models.ProductHistory ||
  mongoose.model('ProductHistory', productHistorySchema);
