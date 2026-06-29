import { NextResponse } from 'next/server';

// IP별 요청 제한 메모리 저장소
const ipRequests = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 1000; // 1초
const MAX_REQUESTS_PER_WINDOW = 5; // 최대 5회

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRequests.get(ip) || [];
  
  // 1초 이내의 요청 타임스탬프만 필터링
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  recent.push(now);
  ipRequests.set(ip, recent);
  
  // 메모리 누수 방지를 위한 주기적 정리 (저장된 IP가 많을 때만 수행)
  if (ipRequests.size > 500) {
    ipRequests.forEach((list, key) => {
      const active = list.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
      if (active.length === 0) {
        ipRequests.delete(key);
      } else {
        ipRequests.set(key, active);
      }
    });
  }
  
  return false;
}

export async function POST(request: Request) {
  try {
    // 클라이언트 IP 추출
    const xForwardedFor = request.headers.get('x-forwarded-for') || '';
    const clientIp = xForwardedFor.split(',')[0].trim() || request.headers.get('x-real-ip') || '127.0.0.1';

    // IP별 초당 요청 횟수 제한 검증
    if (checkRateLimit(clientIp)) {
      return NextResponse.json(
        { success: false, error: '너무 많은 로그인 요청이 발생했습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 429 }
      );
    }

    const { empId, password } = await request.json();
    const gasUrl = process.env.GAS_WEB_APP_URL;
    
    if (!gasUrl) {
      return NextResponse.json({ error: 'GAS_WEB_APP_URL이 설정되지 않았습니다.' }, { status: 500 });
    }
    
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        data: { empId, password }
      }),
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error('GAS 웹앱 응답 실패');
    }
    
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
