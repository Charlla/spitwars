import { NextRequest, NextResponse } from 'next/server';
import { destroySession, clearSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await destroySession(req);

  // Plain <form> posts (e.g. the logout button on the landing page) should
  // land back on the homepage, not on a JSON blob. fetch() callers get JSON.
  const isFormPost = (req.headers.get('content-type') ?? '').includes('form');
  const res = isFormPost
    ? NextResponse.redirect(new URL('/', req.url), 303)
    : NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearSessionCookie());
  return res;
}
