/* ──────────────────────────────────────────────
   Google Apps Script(GAS) 웹 앱 통신 모듈
   ────────────────────────────────────────────── */

const GAS_URL = process.env.GAS_WEB_APP_URL || '';

/**
 * GAS 웹 앱에 GET 요청을 보냅니다.
 * @param action - GAS doGet에 전달할 action 파라미터
 * @param params - 추가 쿼리스트링 파라미터 (예: year, month)
 */
export async function gasGet<T = any>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',   // GAS 웹 앱은 302 리다이렉트를 반환하므로 반드시 follow
  });

  if (!res.ok) {
    throw new Error(`GAS GET 실패 [${action}]: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/**
 * GAS 웹 앱에 POST 요청을 보냅니다.
 * @param action - GAS doPost body 안의 action 키
 * @param data   - 전달할 데이터 본문
 */
export async function gasPost<T = any>(action: string, data: Record<string, any> = {}): Promise<T> {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain' },  // GAS는 text/plain을 권장 (application/json → CORS 프리플라이트 회피)
    body: JSON.stringify({ action, data }),
  });

  if (!res.ok) {
    throw new Error(`GAS POST 실패 [${action}]: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/* ──────────────────────────────────────────────
   인메모리 캐시 유틸리티
   ────────────────────────────────────────────── */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cacheStore = new Map<string, CacheEntry<any>>();
const DEFAULT_CACHE_TTL = 30_000; // 30초

/**
 * 캐시에서 데이터를 조회합니다. 유효기간이 남아있으면 캐시된 데이터를 반환합니다.
 */
export function getCache<T>(key: string, ttl: number = DEFAULT_CACHE_TTL): T | null {
  const entry = cacheStore.get(key);
  if (entry && Date.now() - entry.timestamp < ttl) {
    return entry.data as T;
  }
  return null;
}

/**
 * 캐시에 데이터를 저장합니다.
 */
export function setCache<T>(key: string, data: T): void {
  cacheStore.set(key, { data, timestamp: Date.now() });
}

/**
 * 특정 키의 캐시를 무효화합니다.
 */
export function invalidateCache(key: string): void {
  cacheStore.delete(key);
}

/**
 * 특정 접두사로 시작하는 모든 캐시를 무효화합니다.
 */
export function invalidateCacheByPrefix(prefix: string): void {
  Array.from(cacheStore.keys()).forEach(key => {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  });
}
