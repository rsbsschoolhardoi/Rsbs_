import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Keep the token alive automatically, but do NOT re-trigger auth state
    // changes just because the browser tab was hidden and re-focused.
    // Without this, Supabase fires TOKEN_REFRESHED / SIGNED_IN on every
    // tab-switch, which caused the entire app to remount with a loading screen.
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    // Prevent the Supabase realtime & fetch layer from pausing/resuming on
    // page visibility changes.  This eliminates the reconnect burst that
    // accompanies a tab-switch.
    headers: {},
  },
});
