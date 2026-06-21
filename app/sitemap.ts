import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { createClient } from '@/lib/supabase/server';

// Revalidate hourly — the leaderboard's lastModified is DB-driven.
export const revalidate = 3600;

// Spit Wars has no public per-item pages (rooms are private + ephemeral, and
// players have no public profile pages), so the sitemap is the static public
// surface. The one DB-driven signal we surface is the leaderboard's freshness.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let leaderboardModified = new Date();
  try {
    const db = createClient();
    const { data } = await db
      .from('spitwars_players')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.created_at) leaderboardModified = new Date(data.created_at);
  } catch {
    // Sitemap must never fail the build — fall back to "now".
  }

  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/game`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/online`, changeFrequency: 'monthly', priority: 0.7 },
    {
      url: `${SITE_URL}/leaderboard`,
      lastModified: leaderboardModified,
      changeFrequency: 'daily',
      priority: 0.6,
    },
  ];
}
