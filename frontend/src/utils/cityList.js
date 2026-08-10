export const CITY_DATA = [
  { name: 'Lahore',      lat: 31.5497, lng: 74.3436, demandScore: 90 },
  { name: 'Karachi',     lat: 24.8607, lng: 67.0011, demandScore: 95 },
  { name: 'Islamabad',   lat: 33.6844, lng: 73.0479, demandScore: 75 },
  { name: 'Faisalabad',  lat: 31.4504, lng: 73.1350, demandScore: 65 },
  { name: 'Rawalpindi',  lat: 33.5651, lng: 73.0169, demandScore: 60 },
  { name: 'Multan',      lat: 30.1575, lng: 71.5249, demandScore: 50 },
  { name: 'Peshawar',    lat: 34.0151, lng: 71.5249, demandScore: 45 },
  { name: 'Quetta',      lat: 30.1798, lng: 66.9750, demandScore: 35 },
  { name: 'Sialkot',     lat: 32.4945, lng: 74.5229, demandScore: 55 },
  { name: 'Gujranwala',  lat: 32.1877, lng: 74.1945, demandScore: 50 },
]

export const CITIES = CITY_DATA.map((c) => c.name)

export const CATEGORIES = [
  'All',
  'Fashion',
  'Electronics',
  'Beauty',
  'Home',
  'Grocery',
  'Toys',
  'Sports',
  'Books',
]

export const PLATFORMS = ['Daraz', 'OLX', 'TikTok']

export const CITY_COORDS = Object.fromEntries(
  CITY_DATA.map((c) => [c.name, [c.lat, c.lng]])
)
