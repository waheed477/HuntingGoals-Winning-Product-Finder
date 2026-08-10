export const VALID_CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Faisalabad',
  'Rawalpindi',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
];

export const VALID_CATEGORIES = [
  'Fashion',
  'Electronics',
  'Beauty',
  'Home',
  'Grocery',
  'Toys',
  'Sports',
  'Books',
];

export const VALID_PLATFORMS = ['daraz', 'olx', 'tiktok', 'facebook', 'instagram'];

export const VALID_CHANNELS = ['email', 'telegram', 'both'];

export const VALID_TRENDS = ['rising', 'falling', 'stable'];

export const isValidCity = (city) => VALID_CITIES.includes(city);

export const isValidCategory = (category) => VALID_CATEGORIES.includes(category);

export const isValidPlatform = (platform) => VALID_PLATFORMS.includes(platform);

export const isValidWinScore = (score) =>
  typeof score === 'number' && score >= 0 && score <= 100;

export const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

export const isValidChannel = (channel) => VALID_CHANNELS.includes(channel);

export const isValidTrend = (trend) => VALID_TRENDS.includes(trend);

// Validate a partial product payload; returns array of error messages
export function validateProductPayload(data) {
  const errors = [];
  if (!data.name || typeof data.name !== 'string') errors.push('name is required');
  if (!data.category || !isValidCategory(data.category))
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  if (data.winScore !== undefined && !isValidWinScore(data.winScore))
    errors.push('winScore must be between 0 and 100');
  if (data.cities) {
    const invalid = data.cities.filter((c) => !isValidCity(c));
    if (invalid.length) errors.push(`invalid cities: ${invalid.join(', ')}`);
  }
  if (data.platforms) {
    const invalid = data.platforms.filter((p) => !isValidPlatform(p));
    if (invalid.length) errors.push(`invalid platforms: ${invalid.join(', ')}`);
  }
  return errors;
}

// Validate an alert payload; returns array of error messages
export function validateAlertPayload(data) {
  const errors = [];
  if (!data.userId) errors.push('userId is required');
  if (data.city && !isValidCity(data.city)) errors.push(`invalid city: ${data.city}`);
  if (data.category && !isValidCategory(data.category))
    errors.push(`invalid category: ${data.category}`);
  if (data.minWinScore !== undefined && !isValidWinScore(data.minWinScore))
    errors.push('minWinScore must be between 0 and 100');
  if (data.channel && !isValidChannel(data.channel))
    errors.push(`channel must be one of: ${VALID_CHANNELS.join(', ')}`);
  return errors;
}
