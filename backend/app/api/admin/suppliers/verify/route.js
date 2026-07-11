/**
 * Admin: Verify or reject user-submitted suppliers
 *
 * GET  /api/admin/suppliers/verify  → list pending suppliers
 * PUT  /api/admin/suppliers/verify  → verify or reject a supplier
 *
 * Requires x-admin-key header matching ADMIN_API_KEY env var.
 */

import { connectDB } from '@/lib/db';
import Supplier from '@/models/Supplier';

function checkAdmin(request) {
  const key = process.env.ADMIN_API_KEY;
  if (!key) return false;
  return request.headers.get('x-admin-key') === key;
}

// GET — list suppliers pending review
export async function GET(request) {
  if (!checkAdmin(request)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page   = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit  = Math.min(100, parseInt(searchParams.get('limit') || '20', 10));
    const skip   = (page - 1) * limit;

    const filter = {};
    if (status !== 'all') filter.verificationStatus = status;

    const [suppliers, total] = await Promise.all([
      Supplier.find(filter)
        .populate('addedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Supplier.countDocuments(filter),
    ]);

    return Response.json({
      success: true,
      data: {
        suppliers,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        counts: {
          pending:  await Supplier.countDocuments({ verificationStatus: 'pending' }),
          verified: await Supplier.countDocuments({ verificationStatus: 'verified' }),
          rejected: await Supplier.countDocuments({ verificationStatus: 'rejected' }),
        },
      },
    });
  } catch (err) {
    console.error('[GET /api/admin/suppliers/verify]', err);
    return Response.json({ success: false, error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

// PUT — approve or reject a supplier
export async function PUT(request) {
  if (!checkAdmin(request)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const { supplierId, verified, reviewNote } = body;

    if (!supplierId) {
      return Response.json({ success: false, error: 'supplierId is required' }, { status: 400 });
    }
    if (typeof verified !== 'boolean') {
      return Response.json({ success: false, error: 'verified (boolean) is required' }, { status: 400 });
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return Response.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }

    supplier.verified           = verified;
    supplier.verificationStatus = verified ? 'verified' : 'rejected';
    if (reviewNote) supplier.reviewNote = reviewNote;

    await supplier.save();

    console.log(`[Admin] Supplier "${supplier.name}" → ${supplier.verificationStatus}`);

    return Response.json({
      success: true,
      message: `Supplier "${supplier.name}" has been ${supplier.verificationStatus}.`,
      data: {
        supplier: {
          _id:                supplier._id,
          name:               supplier.name,
          verified:           supplier.verified,
          verificationStatus: supplier.verificationStatus,
          reviewNote:         supplier.reviewNote,
        },
      },
    });
  } catch (err) {
    console.error('[PUT /api/admin/suppliers/verify]', err);
    return Response.json({ success: false, error: 'Failed to update supplier' }, { status: 500 });
  }
}
