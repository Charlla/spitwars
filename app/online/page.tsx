import type { Metadata } from 'next';
import { getSessionPlayer } from '@/lib/auth';
import { RoomLobby } from '@/components/room-lobby';

export const metadata: Metadata = {
  title: 'Play Online',
  description:
    'Play Spit Wars online against a friend. Sign in, create a room, and share your 6-character room code for a live turn-based artillery duel.',
  alternates: { canonical: '/online' },
  openGraph: {
    title: 'Play Spit Wars Online',
    description:
      'Create a room, share your code, and battle a friend in a live artillery match.',
    url: '/online',
  },
};

export default async function OnlinePage() {
  // Guests are allowed — player may be null.
  const player = await getSessionPlayer();
  return <RoomLobby player={player} />;
}
