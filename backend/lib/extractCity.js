/**
 * Pakistani city detection from ad text.
 * Single source of truth — imported by socket-server.js AND fbAdsScraper.js.
 */

// Ordered by population/market size — first match wins when text mentions multiple cities.
const CITY_PATTERNS = [
  { name: 'Karachi',    re: /\bkarachi\b/i     },
  { name: 'Lahore',     re: /\blahore\b/i      },
  { name: 'Islamabad',  re: /\bislamabad\b/i   },
  { name: 'Rawalpindi', re: /\brawalpindi\b|\brwp\b/i },
  { name: 'Faisalabad', re: /\bfaisalabad\b|\bfsd\b/i },
  { name: 'Multan',     re: /\bmultan\b/i      },
  { name: 'Peshawar',   re: /\bpeshawar\b/i    },
  { name: 'Quetta',     re: /\bquetta\b/i      },
  { name: 'Sialkot',    re: /\bsialkot\b/i     },
  { name: 'Gujranwala', re: /\bgujranwala\b/i  },
];

/**
 * Extract a Pakistani city name from one or more text strings.
 * Returns the city name (e.g. "Lahore") or null if none found.
 *
 * @param {...string} texts  One or more text fields (headline, description, advertiserName…)
 * @returns {string|null}
 */
export function extractCity(...texts) {
  const combined = texts.filter(Boolean).join(' ');
  for (const { name, re } of CITY_PATTERNS) {
    if (re.test(combined)) return name;
  }
  return null;
}

export const PAKISTAN_CITIES = CITY_PATTERNS.map((c) => c.name);
