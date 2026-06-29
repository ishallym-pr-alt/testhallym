import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getVersion } from '@/lib/version';

export function GET() {
  return NextResponse.json({ version: getVersion() });
}
