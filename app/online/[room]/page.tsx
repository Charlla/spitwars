import { redirect } from 'next/navigation';
import { getSessionPlayer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { OnlineRoom } from './room-client';

interface Props {
  params: Promise<{ room: string }>;
}

export default async function OnlineRoomPage({ params }: Props) {
  const { room: code } = await params;
  const player = await getSessionPlayer();
  if (!player) redirect('/auth');

  const db = createClient();
  const { data: room } = await db
    .from('spitwars_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (!room) redirect('/online');

  // Only host or guest can enter the room
  if (room.host_id !== player.id && room.guest_id !== player.id) {
    redirect('/online');
  }

  return <OnlineRoom room={room} player={player} />;
}
