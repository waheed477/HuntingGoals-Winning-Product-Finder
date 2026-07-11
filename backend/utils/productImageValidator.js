/**
 * Product Image Validator
 * Validates that product images match the product they represent using
 * URL pattern analysis and keyword matching (no external OCR dependency).
 */

const PRODUCT_TYPE_KEYWORDS = {
  serum:        ['serum', 'dropper', 'ampoule', 'essence', 'vial'],
  moisturizer:  ['moisturizer', 'moisturiser', 'cream', 'jar', 'lotion', 'tub'],
  cleanser:     ['cleanser', 'facewash', 'face-wash', 'foam', 'gel-wash'],
  sunscreen:    ['sunscreen', 'spf', 'sunblock', 'sun-block', 'sunprotect'],
  heater:       ['heater', 'room-heater', 'electric-heater', 'warmair', 'radiator'],
  smartwatch:   ['smartwatch', 'smart-watch', 'fitness-tracker', 'band', 'wristband'],
  airfryer:     ['airfryer', 'air-fryer', 'fryer'],
  jacket:       ['jacket', 'coat', 'hoodie', 'sweater', 'khaddar'],
  shoes:        ['shoes', 'sneakers', 'boots', 'footwear', 'sandals'],
  phone:        ['mobile', 'phone', 'smartphone', 'iphone', 'android'],
};

/**
 * Normalise a string for comparison: lowercase, remove symbols.
 */
function norm(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Analyse the image URL itself for product-type signals.
 * Many CDN URLs embed product slugs (e.g. daraz CDN, shopify).
 */
function extractUrlSignals(imageUrl) {
  if (!imageUrl) return '';
  try {
    const decoded = decodeURIComponent(imageUrl);
    return norm(decoded);
  } catch {
    return norm(imageUrl);
  }
}

/**
 * Detect the expected product type from the product title.
 * Returns { type, keywords } or null if unrecognised.
 */
function detectProductType(title) {
  const t = norm(title);
  for (const [type, keywords] of Object.entries(PRODUCT_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => t.includes(norm(kw))) || t.includes(type)) {
      return { type, keywords };
    }
  }
  return null;
}

/**
 * Validate that a product's image matches its title.
 *
 * @param {string} title       - Product name / title
 * @param {string} imageAlt    - Image alt text (from scraper)
 * @param {string} imageUrl    - Image URL
 * @returns {{ valid: boolean, confidence: number, expectedType: string|null, reason: string }}
 */
export function validateImageMatch(title, imageAlt = '', imageUrl = '') {
  const expected = detectProductType(title);

  if (!expected) {
    return { valid: true, confidence: 0.7, expectedType: null, reason: 'unknown-type' };
  }

  const signals = [norm(imageAlt), extractUrlSignals(imageUrl)].join(' ');

  let matchScore = 0;
  for (const kw of expected.keywords) {
    if (signals.includes(norm(kw))) matchScore += 0.35;
  }

  // Partial title word match in URL gives moderate signal
  const titleWords = norm(title).split(' ').filter((w) => w.length > 3);
  for (const word of titleWords) {
    if (signals.includes(word)) matchScore += 0.1;
  }

  const confidence = Math.min(matchScore, 1);
  const valid = confidence >= 0.35 || signals.length < 10; // low signal = can't invalidate

  return {
    valid,
    confidence,
    expectedType: expected.type,
    reason: valid ? 'match' : 'mismatch',
  };
}

/**
 * Get a category-appropriate placeholder image path.
 * Returns a local path (no external URLs as fallback).
 */
export function getFallbackImage(category) {
  const fallbacks = {
    Beauty:      '/images/fallback-beauty.jpg',
    Electronics: '/images/fallback-electronics.jpg',
    Fashion:     '/images/fallback-fashion.jpg',
    Home:        '/images/fallback-home.jpg',
    Grocery:     '/images/fallback-grocery.jpg',
    Sports:      '/images/fallback-sports.jpg',
    Toys:        '/images/fallback-toys.jpg',
    Books:       '/images/fallback-books.jpg',
  };
  return fallbacks[category] || '/images/fallback-product.jpg';
}

/**
 * Batch-validate an array of product objects.
 * Returns each product with an added `imageValidation` field.
 */
export function batchValidateImages(products) {
  return products.map((p) => ({
    ...p,
    imageValidation: validateImageMatch(p.name, p.imageAlt || '', p.imageUrl || ''),
  }));
}
