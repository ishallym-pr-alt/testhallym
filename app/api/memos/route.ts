import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const GAS_URL = process.env.GAS_WEB_APP_URL || '';

export async function GET() {
  try {
    const res = await fetch(`${GAS_URL}?action=getMemos`, {
      method: 'GET',
      redirect: 'follow',
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /memos GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch memos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(GAS_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'saveMemo', data: body }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /memos POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save memo' }, { status: 500 });
  }
}
