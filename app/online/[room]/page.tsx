import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionPlayer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { OnlineRoom } from './room-client';

// Private, ephemeral game rooms — never index per-room URLs.
export const metadata: Metadata = {
  title: 'Online Room',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ room: string }>;
}

export default async function OnlineRoomPage({ params }: Props) {
  const { room: code } = await params;
  const player = await getSessionPlayer();

  const db = createClient();
  const { data: room } = await db
    .from('spitwars_rooms')
    .select('id, code, host_id, host_name, guest_id, guest_name, status, game_state, updated_at')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (!room) redirect('/online');

  // Identity is session-only (online play is OTP-gated). The client renders a
  // sign-in CTA / join prompt / waiting room / game based on participation.
  return <OnlineRoom room={room} player={player} />;
}
