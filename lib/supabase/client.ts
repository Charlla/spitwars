'use client';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let _client: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase config: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY required');
  }

  _client = createSupabaseClient(url, key);
  return _client;
}
