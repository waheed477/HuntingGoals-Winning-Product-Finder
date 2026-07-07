import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import { withAuth } from '@/middleware/auth';

const VALID_CATEGORIES = ['Fashion', 'Electronics', 'Beauty', 'Home', 'Grocery', 'Toys', 'Sports', 'Books'];
const VALID_PLATFORMS  = ['Facebook Ads', 'Daraz', 'TikTok Shop', 'Instagram', 'OLX'];
const VALID_CITIES     = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala'];

export const POST = withAuth(async (request, context, user) => {
  try {
    await connectDB();

    const { categories, city, platforms } = await request.json();

    if (!categories?.length || !city || !platforms?.length) {
      return Response.json(
        { success: false, error: 'categories, city, and platforms are all required' },
        { status: 400 }
      );
    }

    const invalidCats = categories.filter((c) => !VALID_CATEGORIES.includes(c));
    if (invalidCats.length) {
      return Response.json({ success: false, error: `Invalid categories: ${invalidCats.join(', ')}` }, { status: 400 });
    }

    if (!VALID_CITIES.includes(city)) {
      return Response.json({ success: false, error: `Invalid city: ${city}` }, { status: 400 });
    }

    const invalidPlats = platforms.filter((p) => !VALID_PLATFORMS.includes(p));
    if (invalidPlats.length) {
      return Response.json({ success: false, error: `Invalid platforms: ${invalidPlats.join(', ')}` }, { status: 400 });
    }

    await User.findByIdAndUpdate(user._id, {
      $set: {
        selectedCategories: categories,
        selectedCity:       city,
        selectedPlatforms:  platforms,
        onboardingCompleted: true,
      },
    });

    return Response.json({ success: true, message: 'Onboarding complete' });
  } catch (err) {
    console.error('[POST /api/user/onboarding]', err);
    return Response.json({ success: false, error: 'Failed to save onboarding data' }, { status: 500 });
  }
});
