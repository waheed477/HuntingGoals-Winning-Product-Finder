import { connectDB } from '@/lib/db';
import Supplier from '@/models/Supplier';
import { withAuth } from '@/middleware/auth';

function checkAdmin(request) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return false;
  return request.headers.get('x-admin-key') === adminKey;
}

/**
 * Sort priority:
 *   0 — verified suppliers (official + admin-verified)
 *   1 — community-submitted pending review (sourceType='user')
 *   2 — scraper-found unverified (sourceType='scraper', pending)
 */
function sortPriority(s) {
  if (s.verificationStatus === 'verified' || s.verified) return 0;
  if (s.sourceType === 'user' && s.verificationStatus === 'pending')  return 1;
  return 2;
}

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const city      = searchParams.get('city');
    const category  = searchParams.get('category');
    const search    = searchParams.get('search');
    const page      = Math.max(1, parseInt(searchParams.get('page')  || '1', 10));
    const limit     = Math.min(100, parseInt(searchParams.get('limit') || '20', 10));
    const skip      = (page - 1) * limit;
    const isAdmin   = checkAdmin(request);

    const filter = {};
    if (city     && city     !== 'All') filter.city     = city;
    if (category && category !== 'All') filter.category = category;
    if (search) filter.$text = { $search: search };

    // Hide rejected suppliers from regular users
    if (!isAdmin) filter.verificationStatus = { $ne: 'rejected' };

    const [rawSuppliers, total] = await Promise.all([
      Supplier.find(filter).sort({ verified: -1, rating: -1 }).skip(skip).limit(limit).lean(),
      Supplier.countDocuments(filter),
    ]);

    // Apply three-tier sort: verified → community pending → scraper pending
    const suppliers = rawSuppliers
      .sort((a, b) => sortPriority(a) - sortPriority(b) || (b.rating || 0) - (a.rating || 0))
      .map((s) => ({
        ...s,
        badge: s.verificationStatus === 'verified' || s.verified
          ? 'verified'
          : s.sourceType === 'user'
          ? 'community'
          : 'unverified',
      }));

    return Response.json({
      success: true,
      data: {
        suppliers,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error('[GET /api/suppliers]', err);
    return Response.json({ success: false, error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export const POST = withAuth(async (request, context, user) => {
  try {
    if (!checkAdmin(request) && user.role !== 'admin') {
      return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const body = await request.json();
    const { name, city, category, phone, email, website, address, products, rating, verified, sourceUrl } = body;

    if (!name) {
      return Response.json({ success: false, error: 'Supplier name is required' }, { status: 400 });
    }

    const existing = await Supplier.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, city });
    if (existing) {
      return Response.json({ success: false, error: 'Supplier already exists' }, { status: 409 });
    }

    const supplier = await Supplier.create({
      name, city, category, phone, email, website, address,
      products:           products || [],
      rating:             rating   || 0,
      verified:           verified || false,
      sourceUrl,
      sourceType:         'admin',
      verificationStatus: verified ? 'verified' : 'pending',
      addedBy:            user._id,
    });

    return Response.json({ success: true, data: { supplier } }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/suppliers]', err);
    return Response.json({ success: false, error: 'Failed to create supplier' }, { status: 500 });
  }
});
