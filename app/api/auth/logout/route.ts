import { NextRequest, NextResponse } from 'next/server';
import { destroySession, clearSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await destroySession(req);
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearSessionCookie());
  return res;
}
