import slugify from 'slugify';
import { connectDB } from '@/lib/db';
import { ScrapedAd, Product } from '@/models/index';
import { withAuth } from '@/middleware/auth';
import { identifyProductFromAd } from '@/services/productIdentificationAgent';
import { matchSuppliers } from '@/services/supplierMatching';

// Categories the Product schema allows (kept in sync with models/Product.js)
const VALID_CATEGORIES = ['Fashion', 'Electronics', 'Beauty', 'Home', 'Grocery', 'Toys', 'Sports', 'Books'];

function shapeResponse(sub) {
  return {
    name:                sub.name || null,
    category:            sub.category || null,
    keyFeatures:         sub.keyFeatures || [],
    confidence:          sub.confidence ?? null,
    status:              sub.identificationStatus || 'pending',
    identifiedAt:        sub.identifiedAt || null,
    productSlug:         sub.productSlug || null,
    source:              sub.source || null,
  };
}

// The ad that was actually analysed — surfaced so the UI can show the user
// exactly which creative the AI identified from.
function shapeRepresentativeAd(ad) {
  return {
    imageUrl:       ad.archivedImageUrl || ad.imageUrl || null,
    advertiserName: ad.advertiserName || null,
    daysRunning:    ad.daysRunning ?? null,
    directUrl:      ad.directUrl || null,
    adId:           ad.adId || null,
    city:           ad.city || null,
  };
}

// POST /api/products/winning/identify { productName, category? }
// Winning "products" are category-level aggregations whose display name is a
// keyword extracted from ad headlines (extractTopKeyword) — it is NOT a DB
// field. So the representative ad must be located by category + keyword match
// on headline/description, not by an exact productName lookup.
export const POST = withAuth(async (request, _ctx, user) => {
  try {
    const body        = await request.json().catch(() => ({}));
    const productName = String(body?.productName || '').trim();
    const category    = String(body?.category    || '').trim();
    if (!productName || productName.length > 120) {
      return Response.json({ success: false, error: 'Invalid product name.' }, { status: 400 });
    }

    await connectDB();

    const esc  = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const kwRe = new RegExp(esc(productName.slice(0, 60)), 'i');
    const sort = { daysRunning: -1, scrapedAt: -1 };

    const byKw       = { isActive: true, $or: [{ headline: kwRe }, { description: kwRe }] };
    const byCat      = { isActive: true, ...(category ? { category } : {}) };
    const byKwCat    = { ...byKw, ...(category ? { category } : {}) };
    const hasImage   = { imageUrl: { $nin: [null, ''] } };
    const hasCopy    = { headline: { $nin: [null, ''] } };

    // Selection order: keyword+category+image → keyword+image → category+image
    // → same chain again allowing copy-only ads (text estimation fallback).
    const ad = await ScrapedAd.findOne({ ...byKwCat, ...hasImage }).sort(sort)
            || await ScrapedAd.findOne({ ...byKw,    ...hasImage }).sort(sort)
            || await ScrapedAd.findOne({ ...byCat,   ...hasImage }).sort(sort)
            || await ScrapedAd.findOne({ ...byKwCat, ...hasCopy  }).sort(sort)
            || await ScrapedAd.findOne({ ...byCat,   ...hasCopy  }).sort(sort);

    if (!ad) {
      return Response.json(
        { success: false, error: 'No readable ad is available for this product yet — try again after the next scrape.' },
        { status: 404 }
      );
    }

    // ── Cache hit: already identified → return instantly, no AI call ───────
    if (ad.identifiedProduct?.identificationStatus === 'identified' && ad.identifiedProduct?.name) {
      return Response.json({
        success: true,
        cached:  true,
        identifiedProduct: shapeResponse(ad.identifiedProduct),
        representativeAd:  shapeRepresentativeAd(ad),
      });
    }

    // ── AI vision call ──────────────────────────────────────────────────────
    const outcome = await identifyProductFromAd(ad);

    if (outcome.status === 'failed') {
      console.warn(`[winning-identify] product="${productName}" ad=${ad._id} failed:`, outcome.reason);
      ad.identifiedProduct = {
        ...(ad.identifiedProduct || {}),
        identificationStatus: 'failed',
        rawModelResponse:     outcome.reason,
      };
      await ad.save().catch(() => {});
      return Response.json(
        {
          success: false,
          cached:  false,
          identifiedProduct: shapeResponse(ad.identifiedProduct),
          representativeAd:  shapeRepresentativeAd(ad),
          error:   outcome.reason,
        },
        { status: 502 }
      );
    }

    const { result } = outcome;

    // ── Resolve the linked Product (needed for the sourcing-advice step) ────
    let productSlug = null;
    let product     = null;
    if (outcome.status === 'identified') {
      const slug     = slugify(result.name, { lower: true, strict: true });
      const category = VALID_CATEGORIES.includes(result.category) ? result.category
                     : VALID_CATEGORIES.includes(ad.category)     ? ad.category
                     : 'Home';
      product = await Product.findOne({ slug });
      if (!product) {
        try {
          product = await new Product({
            name:      result.name,
            slug,
            category,
            imageUrl:  ad.imageUrl || null,
            platforms: ['facebook'],
          }).save();
        } catch {
          product = await Product.findOne({ slug }); // concurrent request may have created it
        }
      }
      productSlug = product?.slug || null;
    }

    // ── Persist on the ad (the cache) ───────────────────────────────────────
    ad.identifiedProduct = {
      name:                 result.name,
      category:             result.category,
      keyFeatures:          result.keyFeatures,
      confidence:           result.confidence,
      identificationStatus: outcome.status,
      identifiedAt:         new Date(),
      rawModelResponse:     result.rawModelResponse,
      productSlug,
      source:               result.source || 'image',
    };
    if (product && !ad.product) ad.product = product._id;
    await ad.save();

    // ── Fire-and-forget supplier matching — never blocks, never fails the call ─
    if (product && outcome.status === 'identified') {
      (async () => {
        try {
          const { suppliers } = await matchSuppliers({ category: product.category, city: ad.city || '' });
          if (suppliers.length > 0) {
            product.matchedSuppliers = suppliers.map((s) => s._id);
            await product.save();
          }
        } catch (err) {
          console.warn('[winning-identify] supplier match failed (ignored):', err.message);
        }
      })();
    }

    return Response.json({
      success: true,
      cached:  false,
      identifiedProduct: shapeResponse(ad.identifiedProduct),
      representativeAd:  shapeRepresentativeAd(ad),
    });
  } catch (err) {
    console.error('[POST /api/products/winning/identify]', err.message);
    return Response.json({ success: false, error: 'Identification failed — please try again shortly.' }, { status: 500 });
  }
});
