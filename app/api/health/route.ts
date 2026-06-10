import { NextResponse } from 'next/server';

// BAB convention: every app exposes /api/health → { status: 'ok' }.
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
