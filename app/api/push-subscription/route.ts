import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { empId, subscription } = data;

    if (!empId || !subscription) {
      return NextResponse.json({ success: false, error: 'Missing empId or subscription' }, { status: 400 });
    }

    const API_URL = process.env.GAS_WEB_APP_URL;
    if (!API_URL) {
      throw new Error('GAS_WEB_APP_URL is not configured');
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'saveSubscription',
        data: {
          empId,
          subscription
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save subscription in GAS: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Unknown error from GAS');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in /api/push-subscription:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
