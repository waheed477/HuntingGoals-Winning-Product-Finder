import { connectDB } from '@/lib/db';
import { Product, ScrapedAd } from '@/models/index';

function getSeasonalSource(category) {
  const map = {
    Electronics:  'High demand in Q4 (Nov–Jan)',
    Fashion:      'Peak during Eid & wedding season',
    Beauty:       'Year-round steady demand',
    Home:         'Peak during wedding & moving season',
    Grocery:      'Consistent year-round demand',
    Toys:         'Peak in Eid & school holidays',
    Sports:       'Rising with fitness trends',
    Books:        'Steady with academic calendar',
  };
  return map[category] || 'Standard seasonal demand';
}

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { slug } = params;
    const product = await Product.findOne({ slug }).lean();
    if (!product) {
      return Response.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Live competitor count from ScrapedAd collection (last 7 days)
    const competitorCount = await ScrapedAd.countDocuments({
      category: product.category,
      scrapedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    // ── Signals aligned with Product.updateWinScore formula ──────────────────
    // Daraz   30 pts | OLX       20 pts | TikTok   20 pts
    // Google  15 pts | Seasonal  15 pts = 100 pts total

    const darazRaw  = product.darazOrders     || 0;
    const olxRaw    = product.olxViews        || 0;
    const tiktokRaw = product.tiktokViews     || 0;
    const googleRaw = product.googleTrendSpike|| 0;
    const seasonRaw = product.seasonalRelevance || 0;

    // Each "score" is on 0–100 before weighting
    const darazScore  = Math.min(Math.round((darazRaw  / 1000) * 100), 100);
    const olxScore    = Math.min(Math.round((olxRaw    / 50000) * 100), 100);
    const tiktokScore = Math.min(Math.round((tiktokRaw / 1000000) * 100), 100);
    const googleScore = Math.min(Math.round((googleRaw / 100) * 100), 100); // % itself is 0-100
    const seasonScore = Math.min(seasonRaw, 100);

    // Weighted points (weight columns match the actual model formula)
    const darazPts  = Math.min((darazRaw  / 1000) * 30, 30);
    const olxPts    = Math.min((olxRaw    / 50000) * 20, 20);
    const tiktokPts = Math.min((tiktokRaw / 1000000) * 20, 20);
    const googlePts = Math.min(googleRaw / 5, 15);
    const seasonPts = (seasonRaw / 100) * 15;
    const totalScore = Math.round(Math.min(darazPts + olxPts + tiktokPts + googlePts + seasonPts, 100));

    // ── Extra context signals (not part of the weighted score) ────────────────
    const fbAdsRaw   = product.activeAds        || 0;
    const alibabaRaw = product.alibabaOrderSurge|| 0;

    const breakdown = {
      daraz: {
        label:      'Daraz Sales',
        icon:       'daraz',
        score:      darazScore,
        weight:     30,
        pts:        Math.round(darazPts * 10) / 10,
        rawValue:   darazRaw,
        source:     `${darazRaw.toLocaleString()} orders on Daraz`,
        color:      'orange',
      },
      olx: {
        label:      'OLX Demand',
        icon:       'olx',
        score:      olxScore,
        weight:     20,
        pts:        Math.round(olxPts * 10) / 10,
        rawValue:   olxRaw,
        source:     `${olxRaw.toLocaleString()} views on OLX`,
        color:      'teal',
      },
      tiktok: {
        label:      'TikTok Reach',
        icon:       'tiktok',
        score:      tiktokScore,
        weight:     20,
        pts:        Math.round(tiktokPts * 10) / 10,
        rawValue:   tiktokRaw,
        source:     `${tiktokRaw.toLocaleString()} views on TikTok`,
        color:      'pink',
      },
      google: {
        label:      'Google Trends',
        icon:       'google',
        score:      googleScore,
        weight:     15,
        pts:        Math.round(googlePts * 10) / 10,
        rawValue:   googleRaw,
        source:     `+${googleRaw}% spike in Pakistan searches`,
        color:      'blue',
      },
      seasonal: {
        label:      'Seasonal Fit',
        icon:       'seasonal',
        score:      seasonScore,
        weight:     15,
        pts:        Math.round(seasonPts * 10) / 10,
        rawValue:   seasonRaw,
        source:     getSeasonalSource(product.category),
        color:      'green',
      },
    };

    // Extra context (shown separately, not in total)
    const extras = {
      facebookAds: {
        label:    'Facebook Ads',
        rawValue: fbAdsRaw,
        source:   `${fbAdsRaw} active FB ads · ${competitorCount} competitors tracked this week`,
        color:    'indigo',
      },
      alibaba: {
        label:    'Alibaba Surge',
        rawValue: alibabaRaw,
        source:   `+${alibabaRaw}% supplier order surge`,
        color:    'yellow',
      },
    };

    let recommendation;
    if (totalScore >= 75)      recommendation = 'Strong winning product — consider sourcing immediately';
    else if (totalScore >= 60) recommendation = 'Promising — monitor closely for 1–2 more weeks';
    else if (totalScore >= 40) recommendation = 'Moderate signals — wait for more data before sourcing';
    else                        recommendation = 'Weak signals — high risk, skip for now';

    return Response.json({
      success: true,
      data: {
        productName:     product.name,
        category:        product.category,
        trend:           product.trend,
        priceMin:        product.priceMin,
        priceMax:        product.priceMax,
        totalScore,
        storedScore:     product.winScore,
        isWinning:       totalScore >= 75,
        recommendation,
        breakdown,
        extras,
        competitorCount,
        lastScrapedAt:   product.lastScrapedAt,
      },
    });
  } catch (err) {
    console.error('[GET /api/products/[slug]/score]', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
