import { redirect } from 'next/navigation';
import { getSessionPlayer } from '@/lib/auth';
import { RoomLobby } from '@/components/room-lobby';

export default async function OnlinePage() {
  const player = await getSessionPlayer();
  if (!player) {
    redirect('/auth');
  }
  return <RoomLobby player={player} />;
}
