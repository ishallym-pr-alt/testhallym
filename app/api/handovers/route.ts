import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { gasGet, gasPost, getCache, setCache, invalidateCache } from '@/lib/googleSheets';
import { formatDateTime } from '@/lib/utils';
import { sendWebPushToAll } from '@/lib/webpush';
import { updateVersion } from '@/lib/version';

const CACHE_KEY = 'handovers';

export async function GET() {
  try {
    const cached = getCache<any[]>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);

    const rows = await gasGet<any[]>('getHandovers');

    const data = rows.map(row => {
      let comments: any[] = [];
      try {
        comments = typeof row.comments === 'string'
          ? JSON.parse(row.comments)
          : (row.comments || []);
      } catch {
        comments = [];
      }

      let readBy: string[] = [];
      if (typeof row.readBy === 'string' && row.readBy.trim() !== '') {
        readBy = row.readBy.split(',').map((x: string) => x.trim()).filter(Boolean);
      } else if (Array.isArray(row.readBy)) {
        readBy = row.readBy;
      }

      return {
        id: Number(row.id),
        sender: row.sender || '',
        receiver: row.receiver || '',
        content: row.content || '',
        date: formatDateTime(row.date),
        isSigned: String(row.isSigned).toUpperCase() === 'TRUE',
        signedEmpId: row.signedEmpId || '',
        signedAt: formatDateTime(row.signedAt),
        title: row.title || '',
        mainWorkplace: row.mainWorkplace || '',
        isApproved: row.isApproved || '',
        comments,
        readBy,
      };
    });

    setCache(CACHE_KEY, data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /handovers GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch handovers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const newId = String(Date.now());
    const result = await gasPost('addHandover', {
      id: newId,
      sender: body.sender || '',
      receiver: body.receiver || '',
      content: body.content || '',
      date: body.date || formatDateTime(new Date()),
      title: body.title || '',
      mainWorkplace: body.mainWorkplace || '',
      comments: body.comments || [],
    });

    invalidateCache(CACHE_KEY);
    updateVersion();

    // 미승인 상태이므로 생성 시에는 직원 알림을 발송하지 않고, 부서장 전체 승인이 완료되었을 때 알림을 보냅니다.
    if (result.subscriptions) {
      setCache('last_subscriptions', result.subscriptions);
    }

    return NextResponse.json({
      id: Number(newId),
      sender: body.sender || '',
      receiver: body.receiver || '',
      content: body.content || '',
      date: body.date || formatDateTime(new Date()),
      isSigned: false,
      signedEmpId: '',
      signedAt: '',
      title: body.title || '',
      mainWorkplace: body.mainWorkplace || '',
      isApproved: '',
      comments: body.comments || [],
    });
  } catch (error) {
    console.error('[API /handovers POST] Error:', error);
    return NextResponse.json({ error: 'Failed to add handover' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'sign') {
      // 기존 서명 로직
      await gasPost('updateHandover', {
        id: body.id,
        signedEmpId: body.signedEmpId || '',
        signedAt: body.signedAt || formatDateTime(new Date()),
      });
    } else if (action === 'edit') {
      await gasPost('editHandover', {
        id: body.id,
        title: body.title,
        content: body.content,
        comments: body.comments,
      });
    } else if (action === 'markAsRead') {
      await gasPost('markAsRead', {
        id: body.id,
        category: 'handover',
        userName: body.userName
      });
    } else if (action === 'approve') {
      const result = await gasPost('approveHandover', { id: body.id, isApproved: body.isApproved });
      
      // 모든 부서장의 승인이 완료되었는지 확인하여 알림 발송
      try {
        const employees = await gasGet<any[]>('getEmployees');
        const activeManagers = employees.filter((e: any) => 
          (e.isManager === true || String(e.isManager).toUpperCase() === 'TRUE') &&
          !(e.isRetired === true || String(e.isRetired).toUpperCase() === 'TRUE')
        );

        const approvedNames = body.isApproved ? String(body.isApproved).split(',').map((x: string) => x.trim()).filter(Boolean) : [];
        const isFullyApproved = activeManagers.length > 0 && activeManagers.every(m => approvedNames.includes(m.name));

        if (isFullyApproved) {
          // subscriptions 구하기 (GAS 결과물 또는 캐시/추가 쿼리)
          let subscriptions = result.subscriptions;
          if (!subscriptions) {
            const cachedSubs = getCache<any[]>('last_subscriptions');
            if (cachedSubs) {
              subscriptions = cachedSubs;
            } else {
              try {
                subscriptions = await gasGet<any[]>('getSubscriptions');
              } catch {
                subscriptions = [];
              }
            }
          }
          
          if (subscriptions && subscriptions.length > 0) {
            setCache('last_subscriptions', subscriptions);
            sendWebPushToAll(
              subscriptions,
              { 
                title: '인수인계 승인 완료', 
                body: `${body.sender || '부서원'}님의 인수인계 글이 부서장 전원 승인 완료되어 공개되었습니다.`, 
                url: `/?page=handovers&id=${body.id}` 
              }
            ).catch(console.error);
          }
        }
      } catch (err) {
        console.error('[API /handovers PUT approve notification error]:', err);
      }
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    invalidateCache(CACHE_KEY);
    updateVersion();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /handovers PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update handover' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await gasPost('deleteHandover', { id: Number(id) });

    invalidateCache(CACHE_KEY);
    updateVersion();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /handovers DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete handover' }, { status: 500 });
  }
}
