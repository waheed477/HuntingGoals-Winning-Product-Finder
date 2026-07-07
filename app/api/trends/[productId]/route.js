import { connectDB } from '@/lib/db';
import { TrendScore, Product } from '@/models/index';
import { isValidCity } from '@/lib/validators';
import mongoose from 'mongoose';

const VALID_DAYS = [30, 60, 90];

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { productId } = params;
    if (!productId) {
      return Response.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawDays = parseInt(searchParams.get('days') || '30', 10);
    const days = VALID_DAYS.includes(rawDays) ? rawDays : 30;
    const city = searchParams.get('city');

    if (city && !isValidCity(city)) {
      return Response.json(
        { success: false, error: `Invalid city. Must be one of Pakistan's 10 major cities.` },
        { status: 400 }
      );
    }

    let product = null;
    if (mongoose.Types.ObjectId.isValid(productId)) {
      product = await Product.findById(productId).select('name slug').lean();
    }
    if (!product) {
      product = await Product.findOne({ slug: productId }).select('name slug').lean();
    }
    if (!product) {
      return Response.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const query = {
      productId: product._id,
      date: { $gte: since },
    };
    if (city) query.city = city;

    const trends = await TrendScore.find(query).sort({ date: 1 }).lean();

    const chartData = trends.map((t) => ({
      date: new Date(t.date).toISOString().split('T')[0],
      searchVolume: t.searchVolume,
      dailyScore: t.dailyScore,
      weekOverWeekChange: t.weekOverWeekChange,
    }));

    return Response.json({
      success: true,
      data: {
        product: { id: product._id, name: product.name, slug: product.slug },
        days,
        city: city || null,
        trends: chartData,
      },
    });
  } catch (error) {
    console.error('[GET /api/trends/:productId]', error.message);
    return Response.json(
      { success: false, error: 'Failed to fetch trend data' },
      { status: 500 }
    );
  }
}
