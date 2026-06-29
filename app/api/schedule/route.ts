import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { gasGet, gasPost, getCache, setCache, invalidateCache } from '@/lib/googleSheets';
import { updateVersion } from '@/lib/version';
import { sendWebPushToAll } from '@/lib/webpush';

function getCacheKey(year: number, month: number) {
  return `schedule_${year}_${month}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get('year')) || new Date().getFullYear();
    const month = Number(searchParams.get('month')) || new Date().getMonth() + 1;

    const cacheKey = getCacheKey(year, month);
    // _t 파라미터가 있으면 캐시 우회 (실시간 동기화 시 항상 fresh 데이터 반환)
    const bypassCache = searchParams.has('_t');
    if (!bypassCache) {
      const cached = getCache<any>(cacheKey);
      if (cached) return NextResponse.json(cached);
    }

    const rows = await gasGet<any[]>('getSchedule', {
      year: String(year),
      month: String(month),
    });

    const shifts: Record<string, Record<number, string>> = {};
    const supports: Record<string, Record<number, { am?: string[]; pm?: string[] }>> = {};
    const empIds: string[] = [];

    for (const row of rows) {
      const empId = String(row.empId || '').trim();
      if (!empId) continue;
      if (!empIds.includes(empId)) {
        empIds.push(empId);
      }

      shifts[empId] = {};
      supports[empId] = {};

      for (let d = 1; d <= 31; d++) {
        const shiftVal = row[`day_${d}_shift`] || '';
        if (shiftVal) {
          shifts[empId][d] = shiftVal;
        }

        const amVal = row[`day_${d}_support_am`] || '';
        const pmVal = row[`day_${d}_support_pm`] || '';
        if (amVal || pmVal) {
          supports[empId][d] = {};
          if (amVal) {
            try {
              supports[empId][d].am = typeof amVal === 'string' ? JSON.parse(amVal) : amVal;
            } catch {
              supports[empId][d].am = [];
            }
          }
          if (pmVal) {
            try {
              supports[empId][d].pm = typeof pmVal === 'string' ? JSON.parse(pmVal) : pmVal;
            } catch {
              supports[empId][d].pm = [];
            }
          }
        }
      }
    }

    const data = { year, month, empIds, shifts, supports };
    setCache(cacheKey, data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /schedule GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 엑셀 자동저장({year, ...})과 수동저장({action, data: {year, ...}})의 포맷 차이 대응
    const payload = body.action === 'saveSchedule' && body.data ? body.data : body;
    const { year, month, employees, shifts, supports, diffSummary, editorEmpId, firstChangedKey } = payload;

    const result = await gasPost('saveSchedule', {
      year,
      month,
      employees,
      shifts,
      supports,
    });

    const newVersion = updateVersion();

    let subscriptions = result.subscriptions;
    if (!subscriptions || subscriptions.length === 0) {
      try {
        const getSubsRes = await gasGet<any>('getSubscriptions');
        if (getSubsRes && Array.isArray(getSubsRes)) {
          subscriptions = getSubsRes;
        } else {
          throw new Error((getSubsRes && getSubsRes.error) || 'getSubscriptions returned invalid format');
        }
      } catch (e) {
        console.log('[Schedule] getSubscriptions failed, using fallback notice hack...', e);
        try {
          const dummyId = 'dummy_sub_' + Date.now();
          const hackRes = await gasPost('addNotice', { id: dummyId, title: 'dummy_for_sub', isApproved: false });
          if (hackRes && hackRes.subscriptions) {
            subscriptions = hackRes.subscriptions;
          }
          await gasPost('deleteNotice', { id: dummyId });
        } catch (hackErr) {
          console.error('[Schedule] Hack failed', hackErr);
          subscriptions = getCache('last_subscriptions') || [];
        }
      }
    }

    if (subscriptions && Array.isArray(subscriptions) && subscriptions.length > 0) {
      // 캐시 갱신
      setCache('last_subscriptions', subscriptions);
      
      const pushBody = diffSummary ? diffSummary : `${year}년 ${month}월 근무표가 수정 및 저장되었습니다.`;
      const pushUrl = firstChangedKey ? `/?page=schedule&id=${firstChangedKey}` : '/?page=schedule';
      
      sendWebPushToAll(
        subscriptions,
        { 
          title: '근무표 업데이트', 
          body: pushBody, 
          url: pushUrl 
        },
        editorEmpId // 작성자/수정자는 푸시 알림에서 제외
      ).catch(console.error);
    }

    const cacheKey = getCacheKey(year, month);
    invalidateCache(cacheKey);
    invalidateCache('employees'); // 신규 가입자가 생길 수 있으므로 직원 캐시 무효화
    invalidateCache('vacations'); // 엑셀 업로드 시 연차가 자동 승인 등록되므로 연차 캐시 무효화

    return NextResponse.json({ success: true, version: newVersion });
  } catch (error) {
    console.error('[API /schedule POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { year, month, empId, action } = body;

    const postData: Record<string, any> = { year, month, empId };

    if (action === 'updateShift') {
      postData.updateAction = 'updateShift';
      postData.day = body.day;
      postData.shiftCode = body.shiftCode;
    } else if (action === 'updateSupport') {
      postData.updateAction = 'updateSupport';
      postData.day = body.day;
      if (body.am !== undefined) postData.am = body.am;
      if (body.pm !== undefined) postData.pm = body.pm;
    }

    await gasPost('updateSchedule', postData);

    const cacheKey = getCacheKey(year, month);
    invalidateCache(cacheKey);

    const newVersion = updateVersion();
    return NextResponse.json({ success: true, version: newVersion });
  } catch (error) {
    console.error('[API /schedule PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}
