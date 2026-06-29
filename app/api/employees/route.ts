import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { gasGet, gasPost, getCache, setCache, invalidateCache } from '@/lib/googleSheets';

const CACHE_KEY = 'employees';

export async function GET() {
  try {
    const cached = getCache<any[]>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);

    const rows = await gasGet<any[]>('getEmployees');

    const data = rows.map(row => ({
      no: Number(row.no),
      empId: row.empId || '',
      name: row.name || '',
      position: row.position || '',
      department: row.department || '',
      mainWorkplace: row.mainWorkplace || '',
      subWorkplace: row.subWorkplace || '',
      password: row.password || '',
      isManager: row.isManager === true || String(row.isManager).toUpperCase() === 'TRUE',
      isRetired: row.isRetired === true || String(row.isRetired).toUpperCase() === 'TRUE',
    }));

    setCache(CACHE_KEY, data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /employees GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await gasPost('addEmployee', {
      empId: body.empId || '',
      name: body.name || '',
      position: body.position || '',
      department: body.department || '',
      mainWorkplace: body.mainWorkplace || '',
      subWorkplace: body.subWorkplace || '',
      password: body.password || '',
      isManager: body.isManager === true,
      isRetired: body.isRetired === true,
    });

    invalidateCache(CACHE_KEY);

    return NextResponse.json({
      no: result.no || 0,
      empId: body.empId || '',
      name: body.name || '',
      position: body.position || '',
      department: body.department || '',
      mainWorkplace: body.mainWorkplace || '',
      subWorkplace: body.subWorkplace || '',
      password: body.password || '',
      isManager: body.isManager === true,
      isRetired: body.isRetired === true,
    });
  } catch (error) {
    console.error('[API /employees POST] Error:', error);
    return NextResponse.json({ error: 'Failed to add employee' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { empId, ...updatedFields } = body;

    await gasPost('updateEmployee', {
      empId,
      ...updatedFields,
    });

    invalidateCache(CACHE_KEY);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /employees PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const empId = searchParams.get('empId');

    if (!empId) {
      return NextResponse.json({ error: 'empId is required' }, { status: 400 });
    }

    await gasPost('deleteEmployee', { empId });

    invalidateCache(CACHE_KEY);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /employees DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
