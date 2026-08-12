/**
 * Shared supplier matching logic.
 * Extracted verbatim (behavior unchanged) from GET /api/suppliers/match so the
 * Product Identifier flow can reuse it fire-and-forget instead of duplicating.
 */

import { connectDB } from '../lib/db.js';
import Supplier from '../models/Supplier.js';

const MAJOR_CITIES = ['Lahore', 'Karachi', 'Islamabad'];

/**
 * Match suppliers, preferring the requested city, then major cities, then the
 * whole category (exact same fallback chain as the public route).
 * @returns raw lean supplier docs (max 5) + fallback metadata.
 */
export async function matchSuppliers({ category = '', city = '' } = {}) {
  await connectDB();

  // Build query: category is an exact enum match; city is preferred but optional
  const baseQuery = { verificationStatus: { $ne: 'rejected' } };
  if (category) baseQuery.category = category;

  const cityQuery = city && MAJOR_CITIES.includes(city) ? { ...baseQuery, city } : baseQuery;

  let suppliers = await Supplier.find(cityQuery)
    .sort({ verificationStatus: -1, rating: -1 })
    .limit(5)
    .lean();

  let fallbackUsed = false;
  let fallbackMsg  = null;

  // If filtered by city and no results, broaden to all major cities
  if (suppliers.length === 0 && city) {
    suppliers = await Supplier.find({
      ...baseQuery,
      city: { $in: MAJOR_CITIES },
    })
      .sort({ verificationStatus: -1, rating: -1 })
      .limit(5)
      .lean();
    fallbackUsed = true;
    fallbackMsg  = `No suppliers found in ${city} — showing nearby city suppliers.`;
  }

  // If still nothing, return any suppliers in the category
  if (suppliers.length === 0 && category) {
    suppliers = await Supplier.find({ category })
      .sort({ verificationStatus: -1, rating: -1 })
      .limit(5)
      .lean();
    fallbackUsed = true;
    fallbackMsg  = 'Showing all available suppliers for this category.';
  }

  return { suppliers, fallbackUsed, fallbackMsg };
}
