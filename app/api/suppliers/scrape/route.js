import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, '../../../../scripts/runSupplierScraper.js');
const BACKEND_DIR = path.resolve(__dirname, '../../../..');

const CITIES     = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala'];
const CATEGORIES = ['Electronics', 'Fashion', 'Beauty', 'Home', 'Sports', 'Grocery'];

function checkAdmin(request) {
  const key = process.env.ADMIN_API_KEY;
  if (!key) return false;
  return request.headers.get('x-admin-key') === key;
}

export async function GET(request) {
  if (!checkAdmin(request)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({
    success: true,
    info: 'POST to this endpoint to trigger scraping. Full run takes 10–20 minutes and runs in the background.',
    cities: CITIES,
    categories: CATEGORIES,
    usage: {
      method: 'POST',
      headers: { 'x-admin-key': '<ADMIN_API_KEY>', 'Content-Type': 'application/json' },
      body: '{ "cities": ["Lahore"], "categories": ["Electronics"] } — omit to scrape all',
    },
  });
}

export async function POST(request) {
  if (!checkAdmin(request)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body       = await request.json().catch(() => ({}));
  const cities     = Array.isArray(body.cities)     ? body.cities     : null;
  const categories = Array.isArray(body.categories) ? body.categories : null;

  // Build CLI args
  const args = ['--input-type=module', SCRIPT_PATH];
  if (cities)     args.push('--cities',     cities.join(','));
  if (categories) args.push('--categories', categories.join(','));

  // Spawn scraper as a background child process — it takes 10-20 mins,
  // so we return immediately and let it run independently.
  const child = spawn(process.execPath, args, {
    cwd: BACKEND_DIR,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });

  child.unref();

  console.log(`[/api/suppliers/scrape] Spawned scraper PID=${child.pid}`);

  return Response.json({
    success: true,
    message: 'Supplier scraping started in the background. Check server logs for progress.',
    pid: child.pid,
    cities:     cities     || CITIES,
    categories: categories || CATEGORIES,
    note: 'Full scrape takes 10–20 minutes. Run GET /api/suppliers to check results.',
  });
}
