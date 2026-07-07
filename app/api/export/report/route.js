import { connectDB }        from '@/lib/db';
import { getAdBasedWinners } from '@/services/adWinningService';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season') || 'general';
    const city   = searchParams.get('city')   || '';

    const winners = await getAdBasedWinners(50, city, season);

    const header = 'Rank,Product Name,Win Score,Advertisers,Total Ads,Days Running,Season,City\n';
    const rows   = winners.map((p, i) =>
      `${i + 1},"${(p.name || '').replace(/"/g, '""')}",${p.winScore || 0},${p.advertiserCount || 0},${p.totalAds || 0},${p.maxDaysRunning || 0},"${p.season || 'general'}","${city || 'All'}"`,
    );
    const csv = header + rows.join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="winning-products-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    console.error('[export/report]', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
