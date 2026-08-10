/**
 * Seasonal Service
 * Detects the current Pakistani market season and returns relevance scores.
 * Also integrates with SeasonalEvent MongoDB model for DB-backed events.
 */

import { connectDB } from '../lib/db.js';
import { SeasonalEvent, Product } from '../models/index.js';

// Static seasonal calendar (month 0-indexed)
const SEASONS = [
  {
    name: 'Ramadan',
    startMonth: 2, startDay: 1,
    endMonth: 3, endDay: 5,
    preparationDays: 21,
    relevantCategories: { Fashion: 95, Beauty: 85, Grocery: 90, Home: 70, Electronics: 60, Toys: 50, Sports: 40, Books: 60 },
  },
  {
    name: 'Eid ul Fitr',
    startMonth: 3, startDay: 1,
    endMonth: 3, endDay: 15,
    preparationDays: 14,
    relevantCategories: { Fashion: 100, Beauty: 90, Grocery: 85, Home: 80, Electronics: 70, Toys: 80, Sports: 50, Books: 40 },
  },
  {
    name: 'Eid ul Adha',
    startMonth: 5, startDay: 5,
    endMonth: 5, endDay: 20,
    preparationDays: 14,
    relevantCategories: { Fashion: 90, Beauty: 80, Grocery: 90, Home: 75, Electronics: 65, Toys: 70, Sports: 55, Books: 35 },
  },
  {
    name: 'Summer',
    startMonth: 4, startDay: 1,
    endMonth: 7, endDay: 31,
    preparationDays: 30,
    relevantCategories: { Fashion: 70, Beauty: 75, Grocery: 65, Home: 80, Electronics: 70, Toys: 75, Sports: 85, Books: 45 },
  },
  {
    name: 'Back to School',
    startMonth: 7, startDay: 1,
    endMonth: 8, endDay: 30,
    preparationDays: 21,
    relevantCategories: { Fashion: 80, Beauty: 55, Grocery: 50, Home: 60, Electronics: 85, Toys: 65, Sports: 70, Books: 100 },
  },
  {
    name: 'Wedding Season',
    startMonth: 10, startDay: 1,
    endMonth: 1, endDay: 28,
    preparationDays: 30,
    relevantCategories: { Fashion: 100, Beauty: 95, Grocery: 70, Home: 90, Electronics: 75, Toys: 50, Sports: 45, Books: 40 },
  },
  {
    name: 'Winter',
    startMonth: 10, startDay: 1,
    endMonth: 1, endDay: 28,
    preparationDays: 30,
    relevantCategories: { Fashion: 85, Beauty: 80, Grocery: 70, Home: 90, Electronics: 65, Toys: 75, Sports: 55, Books: 60 },
  },
];

function isInSeason(date, season) {
  const m = date.getMonth();
  const d = date.getDate();
  const start = season.startMonth * 100 + season.startDay;
  const end   = season.endMonth   * 100 + season.endDay;
  const cur   = m * 100 + d;
  if (start <= end) return cur >= start && cur <= end;
  return cur >= start || cur <= end;
}

export function getCurrentSeason(date = new Date()) {
  const active = SEASONS.filter((s) => isInSeason(date, s)).map((s) => s.name);
  return active.length > 0 ? active : ['Off-Peak'];
}

export function getSeasonalRelevance(category, date = new Date()) {
  const activeSeasons = SEASONS.filter((s) => isInSeason(date, s));
  if (activeSeasons.length === 0) return 30;
  const scores = activeSeasons.map((s) => s.relevantCategories[category] || 30);
  return Math.max(...scores);
}

export function getUpcomingSeason(withinDays = 90, date = new Date()) {
  let nearest = null;
  let minDays = Infinity;

  for (const season of SEASONS) {
    const startThisYear = new Date(date.getFullYear(), season.startMonth, season.startDay);
    let diff = Math.ceil((startThisYear - date) / (1000 * 60 * 60 * 24));
    if (diff < 0) {
      const startNextYear = new Date(date.getFullYear() + 1, season.startMonth, season.startDay);
      diff = Math.ceil((startNextYear - date) / (1000 * 60 * 60 * 24));
    }
    if (diff > 0 && diff <= withinDays && diff < minDays) {
      minDays = diff;
      nearest = { name: season.name, daysUntil: diff };
    }
  }
  return nearest;
}

/**
 * Get next 2 upcoming seasons with countdowns and prep dates.
 * Pulls from DB if SeasonalEvent records exist, otherwise falls back to static data.
 */
export async function getUpcomingSeasonEvents(limit = 2) {
  await connectDB();
  const now = new Date();

  try {
    const dbEvents = await SeasonalEvent.find({
      startDate: { $gte: now },
      isActive: true,
    }).sort({ startDate: 1 }).limit(limit).lean();

    if (dbEvents.length > 0) {
      return dbEvents.map((e) => ({
        name: e.name,
        startDate: e.startDate,
        endDate: e.endDate,
        preparationStartDate: e.preparationStartDate,
        daysUntil: Math.ceil((new Date(e.startDate) - now) / (1000 * 60 * 60 * 24)),
        categoryBoost: e.categoryBoost ? Object.fromEntries(e.categoryBoost) : {},
        typicalWinningProducts: e.typicalWinningProducts || [],
      }));
    }
  } catch (err) {
    console.warn('[SeasonalService] DB lookup failed, using static data:', err.message);
  }

  // Fallback: derive next 2 from static SEASONS list
  const upcoming = [];
  for (const season of SEASONS) {
    const startThisYear = new Date(now.getFullYear(), season.startMonth, season.startDay);
    let start = startThisYear;
    if (start <= now) start = new Date(now.getFullYear() + 1, season.startMonth, season.startDay);

    const daysUntil = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
    const prepStart = new Date(start);
    prepStart.setDate(prepStart.getDate() - (season.preparationDays || 21));

    upcoming.push({ name: season.name, startDate: start, daysUntil, preparationStartDate: prepStart, categoryBoost: season.relevantCategories });
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming.slice(0, limit);
}

/**
 * Return products with high seasonalRelevance for the current season.
 */
export async function getSeasonalRecommendations(limit = 10) {
  await connectDB();
  const products = await Product.find({ seasonalRelevance: { $gte: 70 } })
    .sort({ seasonalRelevance: -1, winScore: -1 })
    .limit(limit)
    .select('name slug category winScore seasonalRelevance cities priceMin priceMax imageUrl trend')
    .lean();

  const currentSeasons = getCurrentSeason();
  return { currentSeasons, products };
}

export default { getCurrentSeason, getSeasonalRelevance, getUpcomingSeason, getUpcomingSeasonEvents, getSeasonalRecommendations };
