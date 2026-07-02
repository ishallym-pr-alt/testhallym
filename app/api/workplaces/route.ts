import { NextResponse } from 'next/server';
import { gasGet, setCache, getCache } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
const CACHE_KEY = 'workplaces';

export async function GET() {
  try {
    const cached = getCache<any[]>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);

    const rows = await gasGet<any[]>('getWorkplaces');

    const data = [
      { id: '전체', name: '전체', floor: 'All' },
      ...rows.map(row => ({
        id: row.id || '',
        name: row.name || '',
        floor: row.floor || '',
      }))
    ];

    setCache(CACHE_KEY, data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /workplaces GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch workplaces' }, { status: 500 });
  }
}
