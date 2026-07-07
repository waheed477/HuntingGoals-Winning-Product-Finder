/**
 * Groq AI Service — production-ready with module-level client init and local fallback.
 * Works with or without GROQ_API_KEY. Real AI when key is set, computed analysis when not.
 */

import Groq from 'groq-sdk';
import { connectDB } from '../lib/db.js';
import Supplier from '../models/Supplier.js';
import { calculateOpportunityScore } from './opportunityService.js';

// ── Module-level Groq client init (once at startup) ──────────────────────────
let groqClient = null;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_api_key_here') {
  try {
    groqClient = new Groq({ apiKey: GROQ_API_KEY });
    console.log('✅ Groq AI initialized — real analysis enabled');
  } catch (err) {
    console.warn('⚠️  Groq init failed:', err.message, '— using local fallback');
  }
} else {
  console.log('ℹ️  GROQ_API_KEY not set — AI analysis will use local fallback (add key to Replit Secrets to enable real AI)');
}

/**
 * Query DB for suppliers relevant to a product category + city.
 */
export async function getSuppliersForProduct(productName, category, city = null) {
  try {
    await connectDB();
    const filter = {};
    if (category && category !== 'General') filter.category = category;
    if (city) filter.city = city;
    const suppliers = await Supplier.find(filter)
      .sort({ verified: -1, rating: -1 })
      .limit(3)
      .select('name city phone website rating verified')
      .lean();
    return suppliers.map((s) => ({
      name: s.name, city: s.city, phone: s.phone || null,
      website: s.website || null, rating: s.rating || 0, verified: s.verified || false,
    }));
  } catch { return []; }
}

/**
 * Local (non-AI) analysis computed from product data — always works, no API key needed.
 */
function localAnalysis(productName, productData = {}) {
  const buyPrice  = Math.round((productData.priceMin  || 1500) * 0.45);
  const sellPrice = productData.priceMax || Math.round((productData.priceMin || 1500) * 1.8);
  const score     = productData.winScore || 65;
  const cat       = productData.category || 'General';

  const trend = productData.trend === 'rising'  ? 'showing strong upward momentum'
              : productData.trend === 'falling' ? 'in seasonal decline right now'
              : 'holding steady in the market';

  const summary = `${productName} is ${trend} in Pakistan's ${cat} category — ${
    score >= 70 ? 'a strong opportunity with good demand signals'
    : score >= 50 ? 'a moderate opportunity worth testing with small stock'
    : 'a niche opportunity; validate demand before stocking heavily'
  }.`;

  const darazScore  = Math.min(95, 55 + Math.round((productData.darazOrders || 5000)     / 1000));
  const tiktokScore = Math.min(95, 45 + Math.round((productData.tiktokViews || 1_000_000) / 500_000));
  const olxScore    = Math.min(85, 40 + Math.round((productData.olxViews    || 30_000)    / 5_000));

  const adCopyEN = `Discover the best ${productName} in Pakistan — Rs ${sellPrice.toLocaleString()} with free delivery! ` +
    `High quality, trusted by thousands of buyers. Order now via Daraz or WhatsApp — Cash on Delivery available!`;
  const adCopyUR = `${productName} ab Pakistan mein available! Behtareen quality, mast price pe order karo. ` +
    `Ghar tak free delivery — abhi order karo!`;

  return {
    source: 'local',
    summary,
    score,
    buyPrice,
    sellPrice,
    platforms: [
      { name: 'Daraz',  score: darazScore,  reason: 'Largest Pakistani marketplace with built-in buyer trust' },
      { name: 'TikTok', score: tiktokScore, reason: 'High viral potential for product demos and unboxings' },
      { name: 'OLX',    score: olxScore,    reason: 'Good for local deals and quick cash-on-delivery sales' },
    ],
    adCopyEN,
    adCopyUR,
    competitors: productData.competitorCount || null,
    profitCalculator: {
      buyPrice,
      sellPrice,
      margin:        `${Math.round(((sellPrice - buyPrice) / sellPrice) * 100)}%`,
      profitPerUnit: `Rs. ${(sellPrice - buyPrice).toLocaleString()}`,
    },
    inventoryAdvice: {
      recommendedOrder: score >= 70 ? '100 units' : '50 units',
      reorderWhen:      '20 units left',
      bulkDiscount:     score >= 70 ? 'Order 100+ units for 15% off' : 'Start with a small test batch',
    },
    sourcingLinks: {
      alibaba:    `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(productName)}`,
      daraz:      `https://www.daraz.pk/catalog/?q=${encodeURIComponent(productName)}`,
      aliexpress: `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(productName)}`,
    },
  };
}

/**
 * Send a prompt to Groq and parse the JSON response.
 */
async function callGroq(systemPrompt, userPrompt) {
  const completion = await groqClient.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
    temperature: 0.7,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
  });
  const raw = completion.choices[0]?.message?.content || '{}';
  return JSON.parse(raw);
}

/**
 * Normalize the GROQ response to guarantee the exact shape the frontend expects.
 * Falls back gracefully if the AI omits or misnames any field.
 */
function normalizeAnalysis(ai, productData = {}) {
  const toInt = (v, fallback) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? fallback : n;
  };

  // Support old schema field names as fallbacks
  const profitAnalysis = ai.profitAnalysis || {};
  const adCopy = ai.adCopy || {};

  const buyPrice  = toInt(ai.buyPrice  ?? profitAnalysis.buyPrice,  productData.priceMin  || 1500);
  const sellPrice = toInt(ai.sellPrice ?? profitAnalysis.sellPrice, productData.priceMax  || 3000);

  const platforms = Array.isArray(ai.platforms) && ai.platforms.length
    ? ai.platforms.map((p) => ({
        name:   p.name   || 'Platform',
        score:  toInt(p.score, 70),
        reason: p.reason || '',
      }))
    : [
        { name: 'Daraz',  score: 80, reason: profitAnalysis.recommendedPlatform === 'Daraz'  ? 'Recommended platform' : 'Strong buyer base' },
        { name: 'TikTok', score: 72, reason: 'Good for viral product demos' },
        { name: 'OLX',    score: 60, reason: 'Good for local, second-hand angle' },
      ];

  return {
    summary:     ai.summary     || ai.marketPotential || 'AI analysis complete.',
    score:       toInt(ai.score ?? productData.winScore, 75),
    buyPrice,
    sellPrice,
    platforms,
    adCopyEN:    ai.adCopyEN    || adCopy.english || '',
    adCopyUR:    ai.adCopyUR    || adCopy.urdu    || '',
    competitors: toInt(ai.competitors, null),
  };
}

/**
 * Analyze a product and return profit analysis, ad copy, competitor alert and market potential.
 * @param {string} productName
 * @param {Object} productData - Optional fields: category, winScore, priceMin, priceMax, cities, darazOrders, tiktokViews, activeAds
 * @returns {Promise<Object>}
 */
export async function analyzeProduct(productName, productData = {}) {
  const systemPrompt = `You are a Pakistan e-commerce expert helping sellers on Daraz, OLX, and TikTok Shop.
You analyze products and give practical advice in the context of the Pakistani market (PKR currency, cities like Lahore/Karachi/Islamabad).
Always respond with valid JSON matching the exact schema requested.`;

  const context = productData
    ? `
Category: ${productData.category || 'Unknown'}
Current Win Score: ${productData.winScore || 'N/A'}/100
Price Range: Rs. ${productData.priceMin || '?'} - Rs. ${productData.priceMax || '?'}
Active Cities: ${(productData.cities || []).join(', ') || 'Unknown'}
Daraz Orders: ${productData.darazOrders || 0}
TikTok Views: ${productData.tiktokViews || 0}
Active Facebook Ads: ${productData.activeAds || 0}
`.trim()
    : '';

  const userPrompt = `Analyze this product for Pakistani e-commerce sellers:

Product: ${productName}
${context}

Return a JSON object with EXACTLY this structure (all fields required):
{
  "summary": "one sentence overview of why this product is a good or bad opportunity in Pakistan right now",
  "score": <integer 0-100 representing overall win/opportunity score>,
  "buyPrice": <integer — estimated wholesale/Alibaba buy price in PKR>,
  "sellPrice": <integer — recommended retail selling price in PKR>,
  "platforms": [
    { "name": "Daraz",    "score": <integer 0-100>, "reason": "one short sentence" },
    { "name": "TikTok",   "score": <integer 0-100>, "reason": "one short sentence" },
    { "name": "OLX",      "score": <integer 0-100>, "reason": "one short sentence" }
  ],
  "adCopyEN": "compelling Facebook/Instagram ad copy in English (2-3 sentences with call-to-action)",
  "adCopyUR": "Roman Urdu TikTok ad copy (2-3 sentences, casual tone)",
  "competitors": <integer — estimated number of active sellers currently selling this product on Pakistani platforms>
}`;

  // Use real Groq AI if client is initialized, otherwise local fallback
  let normalized;
  if (groqClient) {
    try {
      const aiResult = await callGroq(systemPrompt, userPrompt);
      normalized = normalizeAnalysis(aiResult, productData);
      normalized.source = 'groq';
    } catch (err) {
      console.warn('[Groq] API call failed, falling back to local analysis:', err.message);
      normalized = localAnalysis(productName, productData);
    }
  } else {
    normalized = localAnalysis(productName, productData);
  }

  // Enrich with real DB suppliers + international opportunity data (fail silently)
  const [suppliers, opportunity] = await Promise.all([
    getSuppliersForProduct(productName, productData.category || null, productData.cities?.[0] || null),
    calculateOpportunityScore(productName).catch(() => null),
  ]);

  const international = opportunity
    ? {
        globalStores:       opportunity.globalStores,
        avgGlobalPrice:     `$${opportunity.avgPriceUSD}`,
        avgGlobalPricePKR:  opportunity.avgPricePKR,
        shippingToPakistan: '15–20 days (Alibaba), 5–7 days (Shopify)',
        opportunityScore:   opportunity.score,
        opportunityGap:     opportunity.gap,
        shopifyStoreCount:  opportunity.shopifyCount,
        localAvailability:  opportunity.localProducts,
      }
    : null;

  return { ...normalized, suppliers, international };
}

/**
 * Generate ad copy in English and Roman Urdu for a product.
 * @param {string} productName
 * @param {string} category
 * @param {string} targetAudience
 * @returns {Promise<{ english: string, urdu: string }>}
 */
export async function generateAdCopy(productName, category, targetAudience = 'general Pakistani shoppers') {
  const systemPrompt = `You are a creative digital marketing expert for Pakistani e-commerce brands.
Write punchy, conversion-focused ad copy. Always respond with valid JSON.`;

  const userPrompt = `Write ad copy for this product:

Product: ${productName}
Category: ${category}
Target Audience: ${targetAudience}

Return JSON with this exact structure:
{
  "english": "Facebook/Instagram ad copy in English (3-4 sentences, include a call-to-action)",
  "urdu": "Roman Urdu TikTok caption (3-4 sentences, casual tone, include emojis, Pakistani slang welcome)",
  "hashtags": ["list", "of", "5", "relevant", "hashtags"]
}`;

  return callGroq(systemPrompt, userPrompt);
}

/**
 * Get seasonal product recommendations for an upcoming Pakistani season.
 * @param {string} currentSeason - e.g. "Ramadan", "Eid ul Fitr", "Winter"
 * @returns {Promise<Object>}
 */
export async function getSeasonalRecommendation(currentSeason) {
  const systemPrompt = `You are a Pakistan market trend analyst.
Give actionable product stocking advice for Pakistani e-commerce sellers.
Always respond with valid JSON.`;

  const userPrompt = `It's currently the "${currentSeason}" season in Pakistan.

Return JSON with this structure:
{
  "season": "${currentSeason}",
  "topProducts": [
    { "name": "product name", "category": "category", "reason": "why it sells well now", "expectedDemand": "High/Medium/Low" }
  ],
  "stockAdvice": "brief paragraph on what to stock and when to order from Alibaba",
  "pricingTip": "specific pricing strategy for this season in the Pakistani market"
}

Include 5 specific product recommendations.`;

  return callGroq(systemPrompt, userPrompt);
}

/**
 * Generate a short one-line AI insight for a high-value alert (winScore >= 85).
 * @param {string} productName
 * @param {number} winScore
 * @param {string} category
 * @returns {Promise<string>}
 */
export async function getAlertInsight(productName, winScore, category) {
  try {
    const groq = getClient();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a Pakistani e-commerce analyst. Write one punchy sentence (max 15 words) explaining why this product is trending. No JSON needed.',
        },
        {
          role: 'user',
          content: `Product: ${productName}, Category: ${category}, Win Score: ${winScore}/100`,
        },
      ],
      temperature: 0.8,
      max_tokens: 60,
    });
    return completion.choices[0]?.message?.content?.trim() || '';
  } catch {
    return '';
  }
}

// ── City area data for local ad guide fallback ────────────────────────────────
function getCityData(city) {
  const cities = {
    'Lahore':     { areas: ['DHA', 'Gulberg', 'Johar Town', 'Model Town', 'Bahria Town'] },
    'Karachi':    { areas: ['Clifton', 'Defence', 'Gulshan', 'Saddar', 'North Nazimabad'] },
    'Islamabad':  { areas: ['F-7', 'F-8', 'G-10', 'E-11', 'I-8'] },
    'Rawalpindi': { areas: ['Saddar', 'Commercial Market', 'Westridge', 'Gulraiz'] },
    'Faisalabad': { areas: ['Clock Tower', 'Madina Town', 'Gulberg', 'Samanabad'] },
    'Multan':     { areas: ['Kachehri Bazaar', 'Cantt', 'Shah Rukn-e-Alam', 'Bosan Road'] },
    'Peshawar':   { areas: ['Saddar', 'University Road', 'Hayatabad', 'Faqirabad'] },
    'Quetta':     { areas: ['Jinnah Road', 'Cantt', 'Satellite Town', 'Brewery Road'] },
  };
  return cities[city] || { areas: ['Main City'] };
}

function generateLocalAdGuide(productName, productData, city) {
  const cityData = getCityData(city);
  const isHighScore   = (productData.winScore || 0) > 75;
  const hasLongRunning = (productData.maxDaysRunning || 0) > 30;

  return {
    targetAudience: {
      locations:  cityData.areas,
      ageRange:   isHighScore ? '25-55' : '18-45',
      gender:     'All',
      interests:  ['Online Shopping', 'Daraz.pk', 'OLX', 'Facebook Marketplace'],
      behaviors:  ['Online Shoppers', 'Home Owners'],
    },
    budget: {
      dailyBudget:  isHighScore ? 'Rs. 1,200' : 'Rs. 800',
      totalBudget:  isHighScore ? 'Rs. 36,000' : 'Rs. 24,000',
      strategy:     `Start with Rs. 800/day and scale to ${isHighScore ? 'Rs. 1,500' : 'Rs. 1,200'}/day after 7 days`,
    },
    bestTime: {
      hours: '6 PM - 10 PM',
      days:  ['Thursday', 'Friday', 'Saturday'],
      avoid: 'Monday mornings',
    },
    adCopyVariations: [
      {
        headline:    `🔥 ${productName} — Limited Time Offer!`,
        description: `Best ${productName} in ${city || 'Pakistan'}. Free delivery on all orders. Order now!`,
        cta:         'Shop Now',
      },
      {
        headline:    `${productName} — Premium Quality at Best Price!`,
        description: `Get the best ${productName} in ${city || 'Pakistan'}. COD available. Limited stock!`,
        cta:         'Order Now',
      },
      {
        headline:    `🎯 ${productName} — Don't Miss Out!`,
        description: `${hasLongRunning ? 'Trusted by 1000+ customers' : 'New arrival'}. Best ${productName} in ${city || 'Pakistan'}.`,
        cta:         'Learn More',
      },
    ],
    visualRecommendations: {
      creativeType: 'video',
      duration:     '15-30 seconds',
      colors:       ['Warm Orange', 'White', 'Teal'],
      textOverlay:  `${productName} — ${isHighScore ? 'Best Seller' : 'New Arrival'}`,
    },
    estimatedResults: {
      reach:              isHighScore ? '50,000 - 70,000' : '30,000 - 50,000',
      conversions:        isHighScore ? '200 - 300' : '100 - 200',
      roas:               isHighScore ? '4x - 6x' : '3x - 4x',
      costPerConversion:  isHighScore ? 'Rs. 150 - 200' : 'Rs. 200 - 300',
    },
  };
}

/**
 * Generate an ad running guide for a product using Groq AI (with local fallback).
 */
export async function generateAdGuide(productName, productData = {}, city = null) {
  const advertiserCount = productData.advertiserCount || 0;
  const totalAds        = productData.totalAds        || 0;
  const maxDaysRunning  = productData.maxDaysRunning   || 0;
  const platforms       = productData.platforms        || ['Facebook'];
  const category        = productData.category         || 'General';

  if (groqClient) {
    try {
      const completion = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert Facebook & Instagram Ads strategist for the Pakistani market. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: `Create a complete ad running guide for:
Product: ${productName}
Category: ${category}
City: ${city || 'Lahore'}
Active advertisers: ${advertiserCount}
Total ads running: ${totalAds}
Longest running ad: ${maxDaysRunning} days
Platforms: ${platforms.join(', ')}

Return JSON:
{
  "targetAudience": { "locations": [], "ageRange": "", "gender": "", "interests": [], "behaviors": [] },
  "budget": { "dailyBudget": "", "totalBudget": "", "strategy": "" },
  "bestTime": { "hours": "", "days": [], "avoid": "" },
  "adCopyVariations": [{ "headline": "", "description": "", "cta": "" }],
  "visualRecommendations": { "creativeType": "", "duration": "", "colors": [], "textOverlay": "" },
  "estimatedResults": { "reach": "", "conversions": "", "roas": "", "costPerConversion": "" }
}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const guide = JSON.parse(completion.choices[0].message.content);
      return { success: true, source: 'groq', guide };
    } catch (err) {
      console.warn('[Groq] ad guide failed, using local fallback:', err.message);
    }
  }

  return {
    success: true,
    source:  'local',
    guide:   generateLocalAdGuide(productName, productData, city),
  };
}

export default { analyzeProduct, generateAdCopy, getSeasonalRecommendation, getAlertInsight, generateAdGuide };
