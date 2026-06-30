import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { gasGet, gasPost, getCache, setCache, invalidateCache } from '@/lib/googleSheets';
import { formatDateTime } from '@/lib/utils';
import { sendWebPushToAll } from '@/lib/webpush';
import { updateVersion } from '@/lib/version';

const CACHE_KEY = 'notices';

export async function GET() {
  try {
    // 캐시 확인
    const cached = getCache<any[]>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);

    const rows = await gasGet<any[]>('getNotices');

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
        title: row.title || '',
        content: row.content || '',
        date: formatDateTime(row.date),
        author: row.author || '',
        category: row.category || '',
        isImportant: String(row.isImportant).toUpperCase() === 'TRUE',
        comments,
        readBy,
        targetDepartment: row.targetDepartment || '',
      };
    });

    setCache(CACHE_KEY, data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /notices GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch notices' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await gasPost('addNotice', {
      id: String(Date.now()),
      title: body.title || '',
      content: body.content || '',
      date: body.date || formatDateTime(new Date()),
      author: body.author || '',
      category: body.category || '',
      isImportant: body.isImportant || false,
      comments: body.comments || [],
      targetDepartment: body.targetDepartment || '',
    });

    invalidateCache(CACHE_KEY);
    updateVersion();

    if (result.subscriptions) {
      setCache('last_subscriptions', result.subscriptions);
      const noticeId = result.id || Date.now();
      sendWebPushToAll(
        result.subscriptions,
        { title: '새로운 공지사항', body: body.title || '공지사항이 등록되었습니다.', url: `/?page=notices&id=${noticeId}` },
        body.authorEmpId
      ).catch(console.error);
    }

    return NextResponse.json({
      id: Number(result.id || Date.now()),
      title: body.title || '',
      content: body.content || '',
      date: body.date || formatDateTime(new Date()),
      author: body.author || '',
      category: body.category || '',
      isImportant: body.isImportant || false,
      comments: body.comments || [],
      targetDepartment: body.targetDepartment || '',
    });
  } catch (error) {
    console.error('[API /notices POST] Error:', error);
    return NextResponse.json({ error: 'Failed to add notice' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'edit') {
      await gasPost('editNotice', {
        id: body.id,
        title: body.title,
        content: body.content,
        isImportant: body.isImportant,
        comments: body.comments,
        category: body.category,
        targetDepartment: body.targetDepartment,
      });
    } else if (action === 'markAsRead') {
      await gasPost('markAsRead', {
        id: body.id,
        category: 'notice',
        userName: body.userName
      });
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    invalidateCache(CACHE_KEY);
    updateVersion();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /notices PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update notice' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await gasPost('deleteNotice', { id: Number(id) });

    invalidateCache(CACHE_KEY);
    updateVersion();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /notices DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete notice' }, { status: 500 });
  }
}
