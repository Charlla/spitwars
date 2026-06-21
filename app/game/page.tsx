import type { Metadata } from 'next';
import GameClient from './game-client';

export const metadata: Metadata = {
  title: 'Play Solo',
  description:
    'Play Spit Wars solo in your browser — battle the AI or pass-and-play on one device. Aim, mind the wind, and spit your way to victory across destructible terrain.',
  alternates: { canonical: '/game' },
  openGraph: {
    title: 'Play Spit Wars — Solo Artillery Battle',
    description:
      'Battle the AI or pass-and-play. Aim, mind the wind, and spit your way to victory.',
    url: '/game',
  },
};

export default function GamePage() {
  return <GameClient />;
}
