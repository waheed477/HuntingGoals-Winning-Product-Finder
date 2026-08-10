import { connectDB } from '@/lib/db';
import { Supplier } from '@/models/index';

const MAJOR_CITIES = ['Lahore', 'Karachi', 'Islamabad'];

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category    = searchParams.get('category')    || '';
    const city        = searchParams.get('city')        || '';
    const productName = searchParams.get('productName') || '';

    // Build query: category is an exact enum match; city is preferred but optional
    const baseQuery = { verificationStatus: { $ne: 'rejected' } };
    if (category) baseQuery.category = category;

    // City filter (exact enum match)
    const cityQuery = city && MAJOR_CITIES.includes(city) ? { ...baseQuery, city } : baseQuery;

    let suppliers = await Supplier.find(cityQuery)
      .sort({ verificationStatus: -1, rating: -1 })
      .limit(5)
      .lean();

    let fallbackUsed  = false;
    let fallbackMsg   = null;

    // If filtered by city and no results, broaden to all major cities
    if (suppliers.length === 0 && city) {
      suppliers = await Supplier.find({
        ...baseQuery,
        city: { $in: MAJOR_CITIES },
      })
        .sort({ verificationStatus: -1, rating: -1 })
        .limit(5)
        .lean();
      fallbackUsed = true;
      fallbackMsg  = `No suppliers found in ${city} — showing nearby city suppliers.`;
    }

    // If still nothing, return any suppliers in the category
    if (suppliers.length === 0 && category) {
      suppliers = await Supplier.find({ category })
        .sort({ verificationStatus: -1, rating: -1 })
        .limit(5)
        .lean();
      fallbackUsed = true;
      fallbackMsg  = 'Showing all available suppliers for this category.';
    }

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
    });
  } catch (err) {
    console.error('[GET /api/suppliers/match]', err.message);
    return Response.json(
      { success: false, error: err.message, suppliers: [] },
      { status: 500 }
    );
  }
}
