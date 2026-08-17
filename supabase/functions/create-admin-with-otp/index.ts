import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, username, password, permissions, is_master, is_blue_tag, otp } = await req.json();

    if (!email || !username || !password || !otp) {
      return new Response(
        JSON.stringify({ error: 'Email, username, password, and OTP are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verify OTP first
    const { data: otpRecord, error: otpError } = await supabaseClient
      .from('email_verification_otps')
      .select('otp_hash, expires_at, attempts, id')
      .eq('email', email)
      .maybeSingle();

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: 'No verification record found. Please request a new OTP' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (otpRecord.attempts >= 5) {
      return new Response(
        JSON.stringify({ error: 'Maximum attempts reached. Please request a new OTP' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: 'OTP has expired. Please request a new OTP' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(otp));
    const userOtpHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (userOtpHash !== otpRecord.otp_hash) {
      await supabaseClient.from('email_verification_otps').update({ attempts: otpRecord.attempts + 1 }).eq('id', otpRecord.id);
      return new Response(JSON.stringify({ error: 'Invalid OTP code' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. OTP is valid, check if admin already exists (uniqueness)
    const { data: existingUser } = await supabaseClient.from('profiles').select('id').eq('username', username).maybeSingle();
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Username already taken' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Create Auth User
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: { username, is_admin: 'true' },
      email_confirm: true,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = authData.user.id;

    // 4. Create/Update Profile (trigger might have created it, but we need to ensure fields are set)
    // Wait for a small delay to ensure trigger finishes if it exists
    await new Promise(resolve => setTimeout(resolve, 500));

    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        role: 'admin',
        username: username,
        permissions: permissions || [],
        is_master: is_master || false,
        is_blue_tag: is_blue_tag || false,
        email: email,
        email_verified: true,
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Even if profile update fails, the user is created. But we should handle it.
    }

    // 5. Cleanup OTP
    await supabaseClient.from('email_verification_otps').delete().eq('id', otpRecord.id);

    return new Response(
      JSON.stringify({ success: true, userId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
