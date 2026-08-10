/**
 * TrendSpy — Secret Audit Script
 * Checks which required environment variables are set (values masked).
 * Run: node trendspy-backend/scripts/exportSecrets.js
 */

const REQUIRED_SECRETS = [
  { key: 'MONGODB_URI',            category: 'Database',  required: true  },
  { key: 'DB_NAME',                category: 'Database',  required: false },
  { key: 'JWT_SECRET',             category: 'Auth',      required: true  },
  { key: 'JWT_EXPIRES_IN',         category: 'Auth',      required: false },
  { key: 'ADMIN_API_KEY',          category: 'Admin',     required: true  },
  { key: 'EMAIL_USER',             category: 'Email',     required: false },
  { key: 'EMAIL_PASS',             category: 'Email',     required: false },
  { key: 'FB_SESSION_COOKIE',      category: 'Scraping',  required: true  },
  { key: 'GROQ_API_KEY',           category: 'AI',        required: true  },
  { key: 'TIKTOK_RAPIDAPI_KEY',    category: 'Scraping',  required: false },
  { key: 'TIKTOK_API_HOST',        category: 'Scraping',  required: false },
  { key: 'AUTO_SCRAPER_ENABLED',   category: 'Features',  required: false },
  { key: 'SEASONAL_FILTERING',     category: 'Features',  required: false },
  { key: 'CONFIDENCE_THRESHOLD',   category: 'Features',  required: false },
  { key: 'SOCKET_INTERNAL_SECRET', category: 'Internal',  required: true  },
  { key: 'SOCKET_INTERNAL_URL',    category: 'Internal',  required: false },
  { key: 'BACKEND_PORT',           category: 'Server',    required: false },
  { key: 'SOCKET_PORT',            category: 'Server',    required: false },
];

function maskValue(key, val) {
  if (!val) return '(not set)';
  if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('cookie') || key.toLowerCase().includes('uri')) {
    const visible = Math.min(6, Math.floor(val.length * 0.15));
    return val.slice(0, visible) + '…' + '*'.repeat(12);
  }
  return val;
}

const categories = {};
let missing = 0;

for (const { key, category, required } of REQUIRED_SECRETS) {
  const val = process.env[key];
  if (!categories[category]) categories[category] = [];
  categories[category].push({ key, val, required, set: !!val });
  if (required && !val) missing++;
}

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║        TrendSpy — Environment Secret Audit          ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

for (const [cat, items] of Object.entries(categories)) {
  console.log(`  ── ${cat} ──`);
  for (const { key, val, required, set } of items) {
    const status  = set  ? '✅' : (required ? '❌' : '⚠️ ');
    const label   = required ? '[required]' : '[optional]';
    const masked  = maskValue(key, val);
    console.log(`  ${status}  ${key.padEnd(28)} ${label.padEnd(12)}  ${masked}`);
  }
  console.log();
}

if (missing === 0) {
  console.log('  ✅ All required secrets are set. App is ready to run.\n');
} else {
  console.log(`  ❌ ${missing} required secret(s) missing. See .env.example for setup instructions.\n`);
  process.exit(1);
}
