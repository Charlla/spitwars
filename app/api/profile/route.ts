import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest) {
  const player = await requireAuth(req);
  if (!player) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const { display_name } = await req.json();
  if (typeof display_name !== 'string') {
    return NextResponse.json({ error: 'display_name required' }, { status: 400 });
  }
  const cleaned = display_name.trim().slice(0, 30);
  if (cleaned.length < 2) {
    return NextResponse.json({ error: 'Display name must be at least 2 characters.' }, { status: 400 });
  }

  const db = createClient();
  const { error } = await db
    .from('spitwars_players')
    .update({ display_name: cleaned, updated_at: new Date().toISOString() })
    .eq('id', player.id);
  if (error) {
    console.error('[profile PATCH]', error);
    return NextResponse.json({ error: 'Could not update profile.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, display_name: cleaned });
}
