import { getSessionPlayer } from '@/lib/auth';
import { RoomLobby } from '@/components/room-lobby';

export default async function OnlinePage() {
  // Guests are allowed — player may be null.
  const player = await getSessionPlayer();
  return <RoomLobby player={player} />;
}
