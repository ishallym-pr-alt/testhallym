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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 중요: 반드시 action과 data로 감싸서 보내야 GAS가 인식함
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'saveMemo', 
        data: body 
      }),
    });
    
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Memo save error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save memo' }, { status: 500 });
  }
}
