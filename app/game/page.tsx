'use client';

import dynamic from 'next/dynamic';

// Canvas must be client-side only — no SSR
const SpitWarsLocal = dynamic(
  () => import('@/components/spitwars-canvas').then((m) => m.default),
  { ssr: false, loading: () => (
    <div className="min-h-screen bg-[#060614] flex items-center justify-center text-white font-mono text-sm">
      Loading...
    </div>
  ) }
);

export default function GamePage() {
  return <SpitWarsLocal />;
}
