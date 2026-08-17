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

    // 1. Extract token from request body
    const { token } = await req.json();

    if (!token) {
      throw new Error('Verification token is required.');
    }

    // 2. Validate token
    const { data: tokenRecord, error: tokenError } = await supabaseClient
      .from('verification_tokens')
      .select('user_id, expires_at, used_at')
      .eq('token', token)
      .maybeSingle();

    if (tokenError || !tokenRecord) {
      throw new Error('Invalid or expired verification link.');
    }

    if (tokenRecord.used_at) {
      throw new Error('Verification link has already been used.');
    }

    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);

    if (now > expiresAt) {
      throw new Error('Verification link has expired. Please request a new one.');
    }

    const userId = tokenRecord.user_id;

    // 3. Update profile to verified
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        email_verified: true,
        account_status: 'active', // Activate upon successful verification
      })
      .eq('id', userId)
      .select('username, email')
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error('Associated admin account not found.');
    }

    // 4. Mark token as used
    await supabaseClient
      .from('verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    // 5. Log success
    await supabaseClient.from('verification_logs').insert({
      user_id: userId,
      email: profile.email,
      event_type: 'verification_success',
      metadata: { source: 'token_link', token_id: token }
    });

    console.log(`[VERIFICATION SUCCESS] for ${profile.email}`);

    return new Response(
      JSON.stringify({ success: true, email: profile.email, username: profile.username }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Verify Token Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
