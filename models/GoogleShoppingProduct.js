import mongoose from 'mongoose';

const googleShoppingProductSchema = new mongoose.Schema(
  {
    productId:       { type: String, required: true, unique: true, index: true },
    productName:     { type: String, required: true, trim: true },
    priceUSD:        { type: Number, default: 0 },
    pricePKR:        { type: Number, default: 0 },
    storeName:       { type: String, default: null },
    storeUrl:        { type: String, default: null },
    rating:          { type: Number, min: 0, max: 5, default: 0 },
    reviewCount:     { type: Number, default: 0 },
    shipsToPakistan: { type: Boolean, default: false },
    imageUrl:        { type: String, default: null },
    productUrl:      { type: String, default: null },
    category:        { type: String, default: 'General', index: true },
    searchTerm:      { type: String, default: null },
    lastSeenAt:      { type: Date, default: Date.now },
  },
  { timestamps: true }
);

googleShoppingProductSchema.index({ category: 1, rating: -1 });
googleShoppingProductSchema.index({ lastSeenAt: -1 });

const GoogleShoppingProduct = mongoose.models.GoogleShoppingProduct
  || mongoose.model('GoogleShoppingProduct', googleShoppingProductSchema);

export default GoogleShoppingProduct;
