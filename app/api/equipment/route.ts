import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { gasGet, gasPost, getCache, setCache, invalidateCache } from '@/lib/googleSheets';
import { formatDateTime } from '@/lib/utils';
import { sendWebPushToAll } from '@/lib/webpush';
import { updateVersion } from '@/lib/version';

const CACHE_KEY = 'equipment';

export async function GET() {
  try {
    const cached = getCache<any[]>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);

    const rows = await gasGet<any[]>('getEquipment');

    const data = rows.map(row => {
      let confirmedUsers: string[] = [];
      try {
        confirmedUsers = typeof row.confirmedUsers === 'string'
          ? JSON.parse(row.confirmedUsers)
          : (row.confirmedUsers || []);
      } catch {
        confirmedUsers = [];
      }

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
        room: row.room || '',
        equipmentName: row.equipmentName || '',
        title: row.title || '',
        content: row.content || '',
        status: row.status || '',
        reporter: row.reporter || '',
        date: formatDateTime(row.date),
        endDate: formatDateTime(row.endDate),
        confirmedUsers,
        department: row.department || '',
        mainWorkplace: row.mainWorkplace || '',
        category: row.category || '의료장비 고장',
        isApproved: String(row.isApproved).toUpperCase() === 'TRUE',
        comments,
        readBy,
      };
    });

    setCache(CACHE_KEY, data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /equipment GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch equipment issues' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const newId = String(Date.now());
    const result = await gasPost('addEquipment', {
      id: newId,
      room: body.room || '',
      equipmentName: body.equipmentName || '',
      title: body.title || '',
      content: body.content || '',
      reporter: body.reporter || '',
      date: body.date || formatDateTime(new Date()),
      endDate: body.endDate || '',
      confirmedUsers: body.confirmedUsers || [body.reporter || '사용자'],
      department: body.department || '',
      mainWorkplace: body.mainWorkplace || '',
      category: body.category || '의료장비 고장',
      comments: body.comments || [],
    });

    invalidateCache(CACHE_KEY);
    updateVersion();

    if (result.subscriptions) {
      setCache('last_subscriptions', result.subscriptions);
      sendWebPushToAll(
        result.subscriptions,
        { title: '새로운 장비 이슈', body: `${body.reporter}님이 ${body.equipmentName} 이슈를 등록했습니다.`, url: `/?page=equipment&id=${newId}` },
        body.reporterEmpId
      ).catch(console.error);
    }

    return NextResponse.json({
      id: Number(newId),
      room: body.room || '',
      equipmentName: body.equipmentName || '',
      title: body.title || '',
      content: body.content || '',
      status: '신고됨',
      reporter: body.reporter || '',
      date: body.date || formatDateTime(new Date()),
      endDate: body.endDate || '',
      confirmedUsers: body.confirmedUsers || [body.reporter || '사용자'],
      department: body.department || '',
      mainWorkplace: body.mainWorkplace || '',
      category: body.category || '의료장비 고장',
      isApproved: false,
      comments: body.comments || [],
    });
  } catch (error) {
    console.error('[API /equipment POST] Error:', error);
    return NextResponse.json({ error: 'Failed to add equipment issue' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, action } = body;

    if (action === 'edit') {
      const result = await gasPost('editEquipment', {
        id,
        equipmentName: body.equipmentName,
        title: body.title,
        content: body.content,
        date: body.date,
        endDate: body.endDate,
        department: body.department,
        mainWorkplace: body.mainWorkplace,
        category: body.category,
        room: body.room,
        status: body.status,
        comments: body.comments,
      });

      if (result.subscriptions && body.comments && body.comments.length > 0) {
        const latestComment = body.comments[body.comments.length - 1];
        sendWebPushToAll(
          result.subscriptions,
          { title: '장비 이슈 새 댓글', body: `${latestComment.author}: ${latestComment.content}`, url: `/?page=equipment&id=${id}` },
          body.commentAuthorEmpId
        ).catch(console.error);
      }
    } else if (action === 'markAsRead') {
      await gasPost('markAsRead', {
        id: body.id,
        category: 'equipment',
        userName: body.userName
      });
    } else if (action === 'approve') {
      await gasPost('approveEquipment', {
        id,
        isApproved: body.isApproved,
      });
    } else {
      // 기존 로직: changeStatus, confirm, toggleMIS
      const postData: Record<string, any> = { id };
      let updateAction = '';

      switch (action) {
        case 'changeStatus':
          updateAction = 'changeStatus';
          postData.newStatus = body.newStatus;
          postData.endDate = body.endDate;
          break;
        case 'confirm':
          updateAction = 'confirm';
          postData.userName = body.userName;
          break;
        default:
          return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }

      postData.updateAction = updateAction;
      await gasPost('updateEquipment', postData);
    }

    invalidateCache(CACHE_KEY);
    updateVersion();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /equipment PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update equipment issue' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await gasPost('deleteEquipment', { id });

    invalidateCache(CACHE_KEY);
    updateVersion();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /equipment DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete equipment issue' }, { status: 500 });
  }
}
