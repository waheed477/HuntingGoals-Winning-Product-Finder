// force-dynamic: without this, next build PRERENDERS GET handlers inside Docker
// (no MONGODB_URI at build time) and the frozen fallback response is served forever.
export const dynamic = 'force-dynamic';

import { matchSuppliers } from '@/services/supplierMatching';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category    = searchParams.get('category')    || '';
    const city        = searchParams.get('city')        || '';
    const productName = searchParams.get('productName') || '';

    // Matching logic lives in services/supplierMatching.js (shared with the
    // Product Identifier flow). productName stays accepted-but-unused, as before.
    const { suppliers, fallbackUsed, fallbackMsg } = await matchSuppliers({ category, city });

    return Response.json({
      success:      true,
      suppliers:    suppliers.map((s) => ({
        _id:                String(s._id),
        name:               s.name,
        city:               s.city,
        category:           s.category,
        phone:              s.phone,
        email:              s.email,
        website:            s.website,
        address:            s.address,
        products:           s.products,
        rating:             s.rating,
        verified:           s.verified,
        verificationStatus: s.verificationStatus,
      })),
      fallbackUsed,
      fallbackMsg,
      productName: productName || undefined,
    });
  } catch (err) {
    console.error('[GET /api/suppliers/match]', err.message);
    return Response.json(
      { success: false, error: err.message, suppliers: [] },
      { status: 500 }
    );
  }
}
