/**
 * Seasonal Filter Service
 * Product-level seasonal scoring with keyword detection.
 * Complements the category-level seasonalService.js with finer-grained
 * product-name analysis.
 */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SEASONAL_PROFILES = {
  winter: {
    months: [10, 11, 0, 1],   // Nov, Dec, Jan, Feb
    keywords: ['heater', 'room heater', 'electric heater', 'jacket', 'winter', 'woolen',
               'sweater', 'boots', 'thermal', 'blanket', 'shawl', 'khaddar', 'flannel', 'quilt'],
    peakScore: 100,
    offSeasonScore: 8,
    hideOffSeason: true,
  },
  summer: {
    months: [4, 5, 6, 7],     // May, Jun, Jul, Aug
    keywords: ['ac', 'air conditioner', 'fan', 'cooler', 'air cooler', 'sunscreen',
               'summer', 'swim', 'swimsuit', 'flip flops', 'sandals', 'cooling'],
    peakScore: 100,
    offSeasonScore: 10,
    hideOffSeason: true,
  },
  eid: {
    months: [2, 3, 5],        // Mar, Apr, Jun  (approximate — lunar shifts yearly)
    keywords: ['eid', 'kurta', 'shalwar kameez', 'dupatta', 'lawn suit', 'mehndi', 'henna'],
    peakScore: 100,
    offSeasonScore: 40,
    hideOffSeason: false,
  },
  ramadan: {
    months: [2, 3],           // Mar–Apr approx
    keywords: ['ramadan', 'sehri', 'iftar', 'prayer mat', 'tasbih', 'attar', 'itar'],
    peakScore: 100,
    offSeasonScore: 20,
    hideOffSeason: false,
  },
  wedding: {
    months: [10, 11, 0, 1, 2], // Nov–Mar wedding season
    keywords: ['wedding', 'bridal', 'shadi', 'mehndi', 'dulha', 'dulhan', 'baraat'],
    peakScore: 100,
    offSeasonScore: 30,
    hideOffSeason: false,
  },
  backToSchool: {
    months: [7, 8],           // Aug, Sep
    keywords: ['school bag', 'stationery', 'notebook', 'geometry box', 'pencil box', 'school uniform'],
    peakScore: 100,
    offSeasonScore: 20,
    hideOffSeason: false,
  },
  yearRound: {
    months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    keywords: ['serum', 'moisturizer', 'moisturiser', 'cleanser', 'face wash',
               'smartwatch', 'smart watch', 'phone', 'charger', 'earphones',
               'kitchen', 'cookware', 'supplement', 'protein'],
    peakScore: 75,
    offSeasonScore: 75,
    hideOffSeason: false,
  },
};

/**
 * Detect which seasonal profile a product belongs to.
 */
function detectSeasonalProfile(productName) {
  const name = productName.toLowerCase();
  for (const [season, config] of Object.entries(SEASONAL_PROFILES)) {
    if (config.keywords.some((kw) => name.includes(kw))) {
      return { season, config };
    }
  }
  return null;
}

/**
 * Get seasonal score and warning for a product.
 *
 * @param {string} category   - Product category
 * @param {string} productName - Product name / title
 * @param {Date}   [date]      - Reference date (defaults to now)
 * @returns {{ score: number, warning: string|null, season: string|null, inSeason: boolean }}
 */
export function getSeasonalScore(category, productName, date = new Date()) {
  const currentMonth = date.getMonth();
  const match = detectSeasonalProfile(productName);

  if (!match) {
    return { score: 65, warning: null, season: null, inSeason: true };
  }

  const { season, config } = match;
  const inSeason = config.months.includes(currentMonth);

  if (!inSeason && config.hideOffSeason) {
    const bestMonths = config.months.map((m) => MONTH_NAMES[m]).join('–');
    return {
      score:   config.offSeasonScore,
      warning: `This is a ${season} product. Best selling window: ${bestMonths}.`,
      season,
      inSeason: false,
    };
  }

  return {
    score:   inSeason ? config.peakScore : config.offSeasonScore,
    warning: !inSeason ? `Demand for ${season} products is lower this time of year.` : null,
    season,
    inSeason,
  };
}

/**
 * Filter and sort a product list, deprioritising off-season items.
 * Off-season products with hideOffSeason=true are moved to the end.
 *
 * @param {Array}  products
 * @param {Date}   [date]
 * @returns {Array}
 */
export function applySeasonalFilter(products, date = new Date()) {
  if (process.env.SEASONAL_FILTERING !== 'true') return products;

  return products
    .map((p) => {
      const { score, warning, inSeason } = getSeasonalScore(p.category, p.name, date);
      return { ...p, _seasonScore: score, _seasonWarning: warning, _inSeason: inSeason };
    })
    .sort((a, b) => {
      // In-season products first, then by original win score
      if (a._inSeason !== b._inSeason) return a._inSeason ? -1 : 1;
      return (b.winScore || 0) - (a.winScore || 0);
    })
    .map(({ _seasonScore, _seasonWarning, _inSeason, ...p }) => ({
      ...p,
      seasonalWarning: _seasonWarning || null,
    }));
}

export default { getSeasonalScore, applySeasonalFilter };
