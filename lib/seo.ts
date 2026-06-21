// Spit Wars — shared SEO / discoverability constants.
// Single source of truth for the public site URL and brand facts so that page
// metadata, JSON-LD, sitemap and robots never drift from one another.

export const SITE_URL = 'https://spitwars.com';
export const SITE_NAME = 'Spit Wars';
export const SITE_TAGLINE = 'Turn-based artillery llamas. Spit happens.';

// 150–160 char description reused across root metadata, OG and JSON-LD.
export const SITE_DESCRIPTION =
  'Spit Wars is a free turn-based artillery game where llamas and alpacas lob spit, mortars and missiles across destructible terrain. Play solo, vs AI, or online.';

export const ORG_NAME = 'Bot & Botty';
export const ORG_URL = 'https://botandbotty.com';
export const CONTACT_EMAIL = 'bot@botandbotty.com';

// Public, indexable routes. Auth (/auth), private rooms (/online/[room]) and all
// /api routes are intentionally excluded — they are noindex / disallowed.
export const PUBLIC_ROUTES = ['/', '/game', '/online', '/leaderboard'] as const;
