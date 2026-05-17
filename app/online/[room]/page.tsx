import { redirect } from 'next/navigation';
import { getSessionPlayer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { OnlineRoom } from './room-client';

interface Props {
  params: Promise<{ room: string }>;
  searchParams: Promise<{ as?: string }>;
}

export default async function OnlineRoomPage({ params, searchParams }: Props) {
  const { room: code } = await params;
  const { as: guestNameFromUrl } = await searchParams;
  const player = await getSessionPlayer();

  const db = createClient();
  const { data: room } = await db
    .from('spitwars_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (!room) redirect('/online');

  // Validate participation — either authed and host/guest, or guest name matches one of the slots
  const isAuthParticipant = !!player && (room.host_id === player.id || room.guest_id === player.id);

  // For unauthed: we'll let the client decide based on localStorage / URL ?as= param
  // (the page is initially rendered with the guestName from the URL, the client can validate)
  return (
    <OnlineRoom
      room={room}
      player={player}
      initialGuestName={!isAuthParticipant && !player ? (guestNameFromUrl ?? null) : null}
    />
  );
}
