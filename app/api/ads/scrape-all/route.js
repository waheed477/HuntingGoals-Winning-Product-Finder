import axios from 'axios';

const SOCKET_BASE_URL = process.env.SOCKET_INTERNAL_URL  || 'http://localhost:3002';
const SOCKET_SECRET   = process.env.SOCKET_INTERNAL_SECRET || 'trendspy-socket-internal';

export async function POST() {
  try {
    await axios.post(
      `${SOCKET_BASE_URL}/internal/run-fb-job`,
      {},
      { headers: { 'x-internal-secret': SOCKET_SECRET }, timeout: 5000 }
    );
    return Response.json({ success: true, message: 'Scrape job started' });
  } catch (err) {
    console.error('[POST /api/ads/scrape-all]', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
