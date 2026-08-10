import { connectDB } from '@/lib/db';
import { Product } from '@/models/index';

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { slug } = params;
    if (!slug) {
      return Response.json(
        { success: false, error: 'Slug is required' },
        { status: 400 }
      );
    }

    const product = await Product.findOne({ slug }).lean();
    if (!product) {
      return Response.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return Response.json({ success: true, data: { product } });
  } catch (error) {
    console.error('Product detail error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
