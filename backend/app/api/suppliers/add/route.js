/**
 * POST /api/suppliers/add
 * Any authenticated user can submit a supplier they know.
 * Saved as sourceType='user', verificationStatus='pending' for admin review.
 */

import { connectDB } from '@/lib/db';
import Supplier from '@/models/Supplier';
import { withAuth } from '@/middleware/auth';

const VALID_CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi',
  'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
];

const VALID_CATEGORIES = [
  'Fashion', 'Electronics', 'Beauty', 'Home',
  'Grocery', 'Toys', 'Sports', 'Books', 'General',
];

export const POST = withAuth(async (request, _context, user) => {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const { name, city, category, phone, website, address } = body;

    // Validate required fields
    if (!name?.trim()) {
      return Response.json({ success: false, error: 'Supplier name is required' }, { status: 400 });
    }
    if (name.trim().length < 2) {
      return Response.json({ success: false, error: 'Name must be at least 2 characters' }, { status: 400 });
    }
    if (city && !VALID_CITIES.includes(city)) {
      return Response.json({ success: false, error: `Invalid city. Choose from: ${VALID_CITIES.join(', ')}` }, { status: 400 });
    }
    if (category && !VALID_CATEGORIES.includes(category)) {
      return Response.json({ success: false, error: `Invalid category` }, { status: 400 });
    }

    // Prevent duplicate submissions from same user for same supplier/city combo
    const existing = await Supplier.findOne({
      name: { $regex: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      ...(city ? { city } : {}),
    });

    if (existing) {
      return Response.json(
        { success: false, error: 'A supplier with this name already exists in the system.' },
        { status: 409 }
      );
    }

    const supplier = await Supplier.create({
      name:               name.trim(),
      city:               city     || null,
      category:           category || 'General',
      phone:              phone    || null,
      website:            website  || null,
      address:            address  || null,
      products:           [],
      rating:             0,
      verified:           false,
      sourceUrl:          'user-submitted',
      sourceType:         'user',
      verificationStatus: 'pending',
      addedBy:            user._id,
    });

    return Response.json(
      {
        success: true,
        message: 'Thank you! Your supplier has been submitted and will be reviewed within 24–48 hours.',
        data: {
          supplier: {
            _id:                supplier._id,
            name:               supplier.name,
            city:               supplier.city,
            category:           supplier.category,
            verificationStatus: supplier.verificationStatus,
          },
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/suppliers/add]', err);
    return Response.json({ success: false, error: 'Failed to submit supplier' }, { status: 500 });
  }
});
