import { connectDB } from './db.js';
import '@/models/User.js';
import '@/models/Product.js';
import '@/models/Alert.js';
import '@/models/AlertLog.js';
import '@/models/TrendScore.js';
import '@/models/ScrapedAd.js';
import '@/models/SeasonalEvent.js';
import '@/models/Supplier.js';
import '@/models/GoogleShoppingProduct.js';
import '@/models/ShopifyProduct.js';

export async function initDb() {
  await connectDB();
  console.log('✅ All models registered');
}
