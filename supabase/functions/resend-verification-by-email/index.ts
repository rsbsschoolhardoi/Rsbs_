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

    // 1. Extract email from request body
    const { email } = await req.json();

    if (!email) {
      throw new Error('Email address is required.');
    }

    const cleanEmail = email.trim().toLowerCase();

    // 2. Check if the user is an unverified admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, email_verified, role')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profileError || !profile) {
      // Security: Don't reveal if email exists, just return success if we want to be sneaky
      // But for admin systems, sometimes a clear message is better.
      throw new Error('No admin account found with this email address.');
    }

    if (profile.role !== 'admin') {
      throw new Error('This operation is only available for administrative accounts.');
    }

    if (profile.email_verified) {
      throw new Error('This email address has already been verified. Please log in.');
    }

    // 3. Rate limiting (Check last resent log)
    const { data: lastResend } = await supabaseClient
      .from('verification_logs')
      .select('created_at')
      .eq('user_id', profile.id)
      .eq('event_type', 'verification_link_resent_self')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastResend) {
      const lastTime = new Date(lastResend.created_at).getTime();
      const now = Date.now();
      const wait = 60 * 1000; // 60 seconds

      if (now - lastTime < wait) {
        throw new Error(`Please wait ${Math.ceil((wait - (now - lastTime)) / 1000)} seconds before requesting a new link.`);
      }
    }

    // 4. Generate and store new token
    await supabaseClient.from('verification_tokens').delete().eq('user_id', profile.id);

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    const { error: tokenError } = await supabaseClient.from('verification_tokens').insert({
      user_id: profile.id,
      token: token,
      expires_at: expiresAt
    });

    if (tokenError) throw tokenError;

    const verificationLink = `https://app-aho9bv0iqbr5.appmedo.com/verify?token=${token}`;
    console.log(`[SELF-SERVICE DISPATCH] Verification Link for ${cleanEmail}: ${verificationLink}`);

    // 5. Log success
    await supabaseClient.from('verification_logs').insert({
      user_id: profile.id,
      email: cleanEmail,
      event_type: 'verification_link_resent_self',
      metadata: { source: 'verify_request_page' }
    });

    return new Response(
      JSON.stringify({ success: true, message: 'If this email belongs to an unverified admin account, a verification link has been sent.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Self-Service Resend Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
