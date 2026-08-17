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

    // 1. Authenticate the verified user (the Master Admin)
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !currentUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Verify role of the current user
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role, is_master')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (!profile || profile.role !== 'admin' || !profile.is_master) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only Master Admins can resend verification links.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Extract request body
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required.');
    }

    // 4. Check if user is an unverified admin
    const { data: targetProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email, email_verified, role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !targetProfile) {
      throw new Error('Target user not found.');
    }

    if (targetProfile.role !== 'admin') {
      throw new Error('Verification links can only be resent for admin accounts.');
    }

    // 4.5 Rate limiting (Check last resent log for this user)
    const { data: lastResend } = await supabaseClient
      .from('verification_logs')
      .select('created_at')
      .eq('user_id', userId)
      .in('event_type', ['verification_link_resent', 'verification_link_sent_on_creation'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastResend) {
      const lastTime = new Date(lastResend.created_at).getTime();
      const now = Date.now();
      const wait = 60 * 1000; // 60 seconds

      if (now - lastTime < wait) {
        throw new Error(`A verification link was recently sent. Please wait ${Math.ceil((wait - (now - lastTime)) / 1000)} seconds before requesting a new one for this user.`);
      }
    }

    // 5. Generate and store new token
    // Invalidate existing ones
    await supabaseClient.from('verification_tokens').delete().eq('user_id', userId);

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    const { error: tokenError } = await supabaseClient.from('verification_tokens').insert({
      user_id: userId,
      token: token,
      expires_at: expiresAt
    });

    if (tokenError) throw tokenError;

    const verificationLink = `https://app-aho9bv0iqbr5.appmedo.com/verify?token=${token}`;
    console.log(`[RESEND DISPATCH] Verification Link for ${targetProfile.email}: ${verificationLink}`);

    // 6. Log success
    await supabaseClient.from('verification_logs').insert({
      user_id: userId,
      email: targetProfile.email,
      event_type: 'verification_link_resent',
      metadata: { action_by: currentUser.id }
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Resend Link Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
