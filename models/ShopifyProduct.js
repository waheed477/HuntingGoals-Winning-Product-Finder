import mongoose from 'mongoose';

const shopifyProductSchema = new mongoose.Schema(
  {
    productId:    { type: String, required: true, unique: true, index: true },
    storeName:    { type: String, default: null },
    storeUrl:     { type: String, default: null },
    productTitle: { type: String, required: true, trim: true },
    productUrl:   { type: String, default: null },
    priceUSD:     { type: Number, default: 0 },
    pricePKR:     { type: Number, default: 0 },
    imageUrl:     { type: String, default: null },
    vendor:       { type: String, default: null },
    tags:         [{ type: String }],
    reviewCount:  { type: Number, default: 0 },
    rating:       { type: Number, min: 0, max: 5, default: 0 },
    category:     { type: String, default: 'General', index: true },
    lastSeenAt:   { type: Date, default: Date.now },
  },
  { timestamps: true }
);

shopifyProductSchema.index({ category: 1, priceUSD: 1 });
shopifyProductSchema.index({ lastSeenAt: -1 });

const ShopifyProduct = mongoose.models.ShopifyProduct
  || mongoose.model('ShopifyProduct', shopifyProductSchema);

export default ShopifyProduct;
