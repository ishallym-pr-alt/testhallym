import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { gasGet, gasPost, getCache, setCache, invalidateCache, invalidateCacheByPrefix } from '@/lib/googleSheets';
import { formatDateTime } from '@/lib/utils';
import { updateVersion } from '@/lib/version';

const CACHE_KEY = 'vacations';

// GET: 연차 내역 조회
export async function GET() {
  try {
    // 캐시 확인
    const cached = getCache<any[]>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);

    const rows = await gasGet<any[]>('getVacations');

    // GAS에서 반환한 키 매핑
    const data = rows.map(row => {
      let vDate = String(row.vacationDate || '');
      if (vDate.includes('T')) {
        const d = new Date(vDate);
        if (!isNaN(d.getTime())) {
          const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
          vDate = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
        }
      }

      return {
        id: String(row.id || ''),
        empId: String(row.empId || ''),
        name: String(row.name || ''),
        department: String(row.department || ''),
        mainWorkplace: String(row.mainWorkplace || ''),
        subWorkplace: String(row.subWorkplace || ''),
        vacationDate: vDate,
        vacationType: String(row.vacationType || ''),
        reason: String(row.reason || ''),
        status: (row.status || '대기') as '대기' | '승인' | '반려',
        createdAt: formatDateTime(row.createdAt),
        handoverEmpId: String(row.handoverEmpId || ''),
      };
    });

    setCache(CACHE_KEY, data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API /vacations GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch vacations' }, { status: 500 });
  }
}

// POST: 신규 연차 신청
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await gasPost('addVacation', {
      id: body.id || String(Date.now()),
      empId: body.empId || '',
      name: body.name || '',
      department: body.department || '',
      mainWorkplace: body.mainWorkplace || '',
      subWorkplace: body.subWorkplace || '',
      vacationDate: body.vacationDate || '',
      vacationType: body.vacationType || '종일연차',
      reason: body.reason || '',
      status: '대기',
      createdAt: body.createdAt || formatDateTime(new Date()),
      handoverEmpId: body.handoverEmpId || '',
    });

    // 연차 캐시 무효화
    invalidateCache(CACHE_KEY);

    const newVersion = updateVersion();
    return NextResponse.json({ ...result, version: newVersion });
  } catch (error: any) {
    console.error('[API /vacations POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add vacation' }, { status: 500 });
  }
}

// PUT: 연차 상태 변경 (승인/반려) 또는 수정
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'edit') {
      await gasPost('editVacation', {
        id: body.id,
        vacationDate: body.vacationDate,
        vacationType: body.vacationType,
        reason: body.reason,
        handoverEmpId: body.handoverEmpId || '',
      });
    } else {
      // 기존 승인/반려 로직
      await gasPost('updateVacationStatus', {
        id: body.id,
        status: body.status,
      });

      // 승인 시 근무표에 연차/반차가 들어가므로 근무표 캐시도 전부 무효화
      invalidateCacheByPrefix('schedule_');
    }

    // 연차 캐시 무효화
    invalidateCache(CACHE_KEY);

    const newVersion = updateVersion();
    return NextResponse.json({ success: true, version: newVersion });
  } catch (error: any) {
    console.error('[API /vacations PUT] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update vacation' }, { status: 500 });
  }
}

// DELETE: 연차 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await gasPost('deleteVacation', { id });

    invalidateCache(CACHE_KEY);
    const newVersion = updateVersion();
    return NextResponse.json({ success: true, version: newVersion });
  } catch (error: any) {
    console.error('[API /vacations DELETE] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete vacation' }, { status: 500 });
  }
}
