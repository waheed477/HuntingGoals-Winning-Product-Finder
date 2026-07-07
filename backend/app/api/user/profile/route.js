import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import { withAuth } from '@/middleware/auth';
import { validatePakistanPhoneNumber } from '@/utils/phoneValidator';

const VALID_CATEGORIES = ['Fashion', 'Electronics', 'Beauty', 'Home', 'Grocery', 'Toys', 'Sports', 'Books'];
const VALID_PLATFORMS  = ['Facebook Ads', 'Daraz', 'TikTok Shop', 'Instagram', 'OLX'];
const VALID_CITIES     = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala'];

const PROFILE_SELECT = 'name email phoneNumber selectedCity selectedCategories selectedPlatforms emailNotifications whatsappNotifications dailyDigest digestTime subscriptionPlan apiKey profilePicture role createdAt lastLogin';

export const GET = withAuth(async (request, context, user) => {
  try {
    await connectDB();

    const profile = await User.findById(user._id).select(PROFILE_SELECT).lean();
    if (!profile) {
      return Response.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: {
        user: {
          id:                   profile._id,
          name:                 profile.name,
          email:                profile.email,
          phoneNumber:          profile.phoneNumber  || null,
          city:                 profile.selectedCity || null,
          selectedCategories:   profile.selectedCategories  || [],
          selectedPlatforms:    profile.selectedPlatforms   || [],
          emailNotifications:   profile.emailNotifications,
          whatsappNotifications: profile.whatsappNotifications,
          dailyDigest:          profile.dailyDigest,
          digestTime:           profile.digestTime,
          subscriptionPlan:     profile.subscriptionPlan || 'free',
          apiKey:               profile.apiKey || null,
          profilePicture:       profile.profilePicture || null,
          createdAt:            profile.createdAt,
        },
      },
    });
  } catch (err) {
    console.error('[GET /api/user/profile]', err);
    return Response.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 });
  }
});

export const PUT = withAuth(async (request, context, user) => {
  try {
    await connectDB();

    const body = await request.json();
    const {
      name,
      phoneNumber,
      city,
      selectedCategories,
      selectedPlatforms,
      emailNotifications,
      whatsappNotifications,
      dailyDigest,
      digestTime,
    } = body;

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return Response.json({ success: false, error: 'Name cannot be empty' }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (phoneNumber !== undefined) {
      if (phoneNumber !== null && phoneNumber !== '') {
        if (!validatePakistanPhoneNumber(phoneNumber)) {
          return Response.json(
            { success: false, error: 'Invalid phone number. Use Pakistani format: +923XXXXXXXXX' },
            { status: 400 }
          );
        }
        updates.phoneNumber = phoneNumber;
      } else {
        updates.phoneNumber = null;
      }
    }

    if (city !== undefined) {
      if (city !== null && city !== '' && !VALID_CITIES.includes(city)) {
        return Response.json({ success: false, error: `Invalid city. Choose from: ${VALID_CITIES.join(', ')}` }, { status: 400 });
      }
      updates.selectedCity = city || null;
    }

    if (selectedCategories !== undefined) {
      if (!Array.isArray(selectedCategories)) {
        return Response.json({ success: false, error: 'selectedCategories must be an array' }, { status: 400 });
      }
      const invalid = selectedCategories.filter((c) => !VALID_CATEGORIES.includes(c));
      if (invalid.length) {
        return Response.json({ success: false, error: `Invalid categories: ${invalid.join(', ')}` }, { status: 400 });
      }
      updates.selectedCategories = selectedCategories;
    }

    if (selectedPlatforms !== undefined) {
      if (!Array.isArray(selectedPlatforms)) {
        return Response.json({ success: false, error: 'selectedPlatforms must be an array' }, { status: 400 });
      }
      const invalid = selectedPlatforms.filter((p) => !VALID_PLATFORMS.includes(p));
      if (invalid.length) {
        return Response.json({ success: false, error: `Invalid platforms: ${invalid.join(', ')}` }, { status: 400 });
      }
      updates.selectedPlatforms = selectedPlatforms;
    }

    if (emailNotifications    !== undefined) updates.emailNotifications    = Boolean(emailNotifications);
    if (whatsappNotifications !== undefined) updates.whatsappNotifications = Boolean(whatsappNotifications);
    if (dailyDigest           !== undefined) updates.dailyDigest           = Boolean(dailyDigest);
    if (digestTime            !== undefined) updates.digestTime            = digestTime;

    const updated = await User.findByIdAndUpdate(
      user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select(PROFILE_SELECT).lean();

    return Response.json({
      success: true,
      data: {
        user: {
          id:                   updated._id,
          name:                 updated.name,
          email:                updated.email,
          phoneNumber:          updated.phoneNumber  || null,
          city:                 updated.selectedCity || null,
          selectedCategories:   updated.selectedCategories  || [],
          selectedPlatforms:    updated.selectedPlatforms   || [],
          emailNotifications:   updated.emailNotifications,
          whatsappNotifications: updated.whatsappNotifications,
          dailyDigest:          updated.dailyDigest,
          digestTime:           updated.digestTime,
          subscriptionPlan:     updated.subscriptionPlan || 'free',
          apiKey:               updated.apiKey || null,
          profilePicture:       updated.profilePicture || null,
          createdAt:            updated.createdAt,
        },
      },
    });
  } catch (err) {
    console.error('[PUT /api/user/profile]', err);
    return Response.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
  }
});
