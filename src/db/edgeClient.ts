import { createClient } from '@supabase/supabase-js';

/**
 * Dedicated Supabase client for Edge Function calls.
 * Credentials are always included so the cross-origin device_id cookie
 * set by the trusted-device Edge Function is sent with every request.
 */
export const edgeSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, credentials: 'include' }),
    },
  }
);
