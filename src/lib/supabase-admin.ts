/**
 * $lib/supabase-admin.ts
 *
 * Server-only Supabase client using the service role key.
 * Import this ONLY in +server.ts files, never in .svelte components.
 *
 * The service role key bypasses Row Level Security — handle with care.
 */

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  },
);