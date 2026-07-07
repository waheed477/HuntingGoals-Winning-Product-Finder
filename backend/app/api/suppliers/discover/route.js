import { connectDB } from '@/lib/db';
import { withAuth } from '@/middleware/auth';
import { scrapeSuppliers } from '@/scrapers/supplierScraper';

function checkAdmin(request) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return false;
  return request.headers.get('x-admin-key') === adminKey;
}

export const POST = withAuth(async (request, context, user) => {
  try {
    if (!checkAdmin(request) && user.role !== 'admin') {
      return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    if (process.env.SUPPLIER_SCRAPER_ENABLED !== 'true') {
      return Response.json(
        { success: false, error: 'Supplier scraper is disabled. Set SUPPLIER_SCRAPER_ENABLED=true' },
        { status: 503 }
      );
    }

    await connectDB();

    const body = await request.json().catch(() => ({}));
    const cities     = body.cities     || ['Lahore', 'Karachi', 'Islamabad'];
    const categories = body.categories || ['Electronics', 'Fashion', 'Beauty'];

    const { saved, skipped, errors } = await scrapeSuppliers({ cities, categories });

    return Response.json({
      success: true,
      data: { saved, skipped, errors: errors.length, errorDetails: errors.slice(0, 5) },
    });
  } catch (err) {
    console.error('[POST /api/suppliers/discover]', err);
    return Response.json({ success: false, error: err.message || 'Supplier discovery failed' }, { status: 500 });
  }
});
