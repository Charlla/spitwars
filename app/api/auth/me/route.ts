import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const player = await requireAuth(req);
  if (!player) return NextResponse.json({ player: null }, { status: 200 });
  return NextResponse.json({ player });
}
