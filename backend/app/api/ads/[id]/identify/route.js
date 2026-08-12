import mongoose from 'mongoose';
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

// POST /api/ads/[id]/identify — on-demand, cached AI product identification.
// Never re-bills the AI for an already-identified ad.
export const POST = withAuth(async (request, { params }, user) => {
  try {
    const { id } = params;
    if (!mongoose.isValidObjectId(id)) {
      return Response.json({ success: false, error: 'Invalid ad id.' }, { status: 400 });
    }

    await connectDB();
    const ad = await ScrapedAd.findById(id);
    if (!ad) {
      return Response.json({ success: false, error: 'Ad not found.' }, { status: 404 });
    }

    // ── Cache hit: already identified → return instantly, no AI call ───────
    if (ad.identifiedProduct?.identificationStatus === 'identified' && ad.identifiedProduct?.name) {
      return Response.json({ success: true, cached: true, identifiedProduct: shapeResponse(ad.identifiedProduct) });
    }

    // ── AI vision call ──────────────────────────────────────────────────────
    const outcome = await identifyProductFromAd(ad);

    if (outcome.status === 'failed') {
      console.warn(`[identify] ad=${id} failed:`, outcome.reason);
      ad.identifiedProduct = {
        ...(ad.identifiedProduct || {}),
        identificationStatus: 'failed',
        rawModelResponse:     outcome.reason,
      };
      await ad.save().catch(() => {});
      return Response.json(
        { success: false, cached: false, identifiedProduct: shapeResponse(ad.identifiedProduct), error: outcome.reason },
        { status: 502 }
      );
    }

    const { result } = outcome;

    // ── Resolve the linked Product (needed for the sourcing-advice step) ────
    // Cheap DB op — done synchronously so the response includes a productSlug.
    // Only 'identified' results create/link products; low-confidence stays ad-scoped.
    let productSlug = null;
    let product     = null;
    if (outcome.status === 'identified') {
      const slug = slugify(result.name, { lower: true, strict: true });
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
          console.warn('[identify] supplier match failed (ignored):', err.message);
        }
      })();
    }

    return Response.json({ success: true, cached: false, identifiedProduct: shapeResponse(ad.identifiedProduct) });
  } catch (err) {
    console.error('[POST /api/ads/[id]/identify]', err.message);
    return Response.json({ success: false, error: 'Identification failed — please try again shortly.' }, { status: 500 });
  }
});
