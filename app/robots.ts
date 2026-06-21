import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// Public marketing/game surface is open to everyone, including the AI crawlers we
// want to be cited by. Private/auth-gated surfaces stay disallowed:
//   /api/*           — JSON endpoints, never indexable content
//   /auth            — sign-in form (noindex)
//   /online/*        — private game rooms (per-user, ephemeral)
const DISALLOW = ['/api/', '/auth', '/online/'];

// AI assistants we explicitly welcome for public content (GEO / answer-engine).
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'PerplexityBot',
  'Google-Extended',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_BOTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: DISALLOW,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
