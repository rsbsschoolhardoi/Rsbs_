import { createClient } from 'jsr:@supabase/supabase-js@2';

const DEVICE_COOKIE = 'rsbs_device_id';
const TRUST_DAYS = 90;
const MAX_COOKIE_AGE = 60 * 60 * 24 * 365; // 1 year

interface SavedAccountRow {
  profile_id: string;
  role: string;
  full_name: string;
  login_id: string;
  verification_id: string;
  avatar_url: string | null;
  pin_verified: boolean;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name) cookies[name] = decodeURIComponent(rest.join('=') || '');
  }
  return cookies;
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function buildCookie(deviceId: string, req: Request): string {
  const isLocal = req.headers.get('origin')?.startsWith('http://localhost') ?? false;
  // Secure is required for SameSite=None. Most browsers also accept Secure on https://localhost.
  const sameSite = isLocal ? 'Lax' : 'None';
  const secure = isLocal ? '' : 'Secure';
  return `${DEVICE_COOKIE}=${encodeURIComponent(deviceId)}; Path=/; HttpOnly; Max-Age=${MAX_COOKIE_AGE}; SameSite=${sameSite}${secure ? `; ${secure}` : ''}`;
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const cookies = parseCookies(req.headers.get('cookie'));
  let deviceId = cookies[DEVICE_COOKIE];
  if (!deviceId) {
    deviceId = crypto.randomUUID();
  }

  const setCookie = buildCookie(deviceId, req);

  try {
    // Ensure device exists
    const { error: upsertDeviceError } = await supabase
      .from('trusted_devices')
      .upsert({ device_id: deviceId, last_seen_at: new Date().toISOString() }, { onConflict: 'device_id' });
    if (upsertDeviceError) throw upsertDeviceError;

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'list') {
      const { data, error } = await supabase
        .from('saved_accounts')
        .select('profile_id, role, full_name, login_id, verification_id, avatar_url, pin_verified, otp_verified, updated_at')
        .eq('device_id', deviceId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return jsonResponse({ accounts: data || [] }, 200, { ...corsHeaders, 'Set-Cookie': setCookie });
    }

    if (action === 'add') {
      const {
        profile_id,
        role,
        full_name,
        login_id,
        verification_id,
        avatar_url,
        pin_verified = false,
        otp_verified = false,
      } = body;

      if (!profile_id || !role || !full_name || !verification_id) {
        return jsonResponse({ error: 'Missing required fields' }, 400, { ...corsHeaders, 'Set-Cookie': setCookie });
      }

      const { data, error } = await supabase
        .from('saved_accounts')
        .upsert({
          device_id: deviceId,
          profile_id,
          role,
          full_name,
          login_id: login_id || verification_id,
          verification_id,
          avatar_url,
          pin_verified,
          otp_verified,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'device_id, profile_id' })
        .select('profile_id, role, full_name, login_id, verification_id, avatar_url, pin_verified, otp_verified, updated_at')
        .single();

      if (error) throw error;
      return jsonResponse({ account: data }, 200, { ...corsHeaders, 'Set-Cookie': setCookie });
    }

    if (action === 'remove') {
      const { profile_id } = body;
      if (!profile_id) {
        return jsonResponse({ error: 'profile_id is required' }, 400, { ...corsHeaders, 'Set-Cookie': setCookie });
      }
      const { error } = await supabase
        .from('saved_accounts')
        .delete()
        .eq('device_id', deviceId)
        .eq('profile_id', profile_id);
      if (error) throw error;
      return jsonResponse({ success: true }, 200, { ...corsHeaders, 'Set-Cookie': setCookie });
    }

    if (action === 'logout') {
      // Same as remove but named explicitly for the logout flow.
      const { profile_id } = body;
      if (!profile_id) {
        return jsonResponse({ error: 'profile_id is required' }, 400, { ...corsHeaders, 'Set-Cookie': setCookie });
      }
      const { error } = await supabase
        .from('saved_accounts')
        .delete()
        .eq('device_id', deviceId)
        .eq('profile_id', profile_id);
      if (error) throw error;
      return jsonResponse({ success: true }, 200, { ...corsHeaders, 'Set-Cookie': setCookie });
    }

    if (action === 'switch') {
      const { profile_id } = body;
      if (!profile_id) {
        return jsonResponse({ error: 'profile_id is required' }, 400, { ...corsHeaders, 'Set-Cookie': setCookie });
      }

      const { data: saved, error: savedError } = await supabase
        .from('saved_accounts')
        .select('pin_verified, updated_at')
        .eq('device_id', deviceId)
        .eq('profile_id', profile_id)
        .single();

      if (savedError || !saved) {
        return jsonResponse({ error: 'Account not found on this device' }, 404, { ...corsHeaders, 'Set-Cookie': setCookie });
      }

      if (!saved.pin_verified) {
        return jsonResponse({ error: 'PIN verification required', require_pin: true }, 403, { ...corsHeaders, 'Set-Cookie': setCookie });
      }

      const trustExpiry = new Date(saved.updated_at);
      trustExpiry.setDate(trustExpiry.getDate() + TRUST_DAYS);
      if (new Date() > trustExpiry) {
        return jsonResponse({ error: 'Trusted session expired', require_pin: true }, 403, { ...corsHeaders, 'Set-Cookie': setCookie });
      }

      // Fetch the auth user's email to generate a one-time magic-link token.
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile_id);
      if (userError || !userData?.user?.email) {
        return jsonResponse({ error: 'Unable to locate account email' }, 500, { ...corsHeaders, 'Set-Cookie': setCookie });
      }

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: userData.user.email,
      });

      if (linkError || !linkData?.properties?.hashed_token) {
        console.error('generateLink error:', linkError);
        return jsonResponse({ error: 'Failed to generate secure token' }, 500, { ...corsHeaders, 'Set-Cookie': setCookie });
      }

      // Refresh last seen on this device
      await supabase.from('saved_accounts').update({ updated_at: new Date().toISOString() }).eq('device_id', deviceId).eq('profile_id', profile_id);
      await supabase.from('trusted_devices').update({ last_seen_at: new Date().toISOString() }).eq('device_id', deviceId);

      return jsonResponse({
        hashed_token: linkData.properties.hashed_token,
        email: userData.user.email,
      }, 200, { ...corsHeaders, 'Set-Cookie': setCookie });
    }

    return jsonResponse({ error: 'Unknown action' }, 400, { ...corsHeaders, 'Set-Cookie': setCookie });
  } catch (error) {
    console.error('trusted-device error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500, { ...corsHeaders, 'Set-Cookie': setCookie });
  }
});
