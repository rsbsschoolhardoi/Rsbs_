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

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { verifiedUserId } = await req.json();
    if (!verifiedUserId) {
      return new Response(JSON.stringify({ error: 'verifiedUserId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Get the newly verified email from the temporary user
    const { data: verifiedAuthUser, error: verifiedAuthError } = await supabaseClient.auth.admin.getUserById(verifiedUserId);
    if (verifiedAuthError || !verifiedAuthUser.user?.email) {
      return new Response(JSON.stringify({ error: 'Could not get verified email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const newEmail = verifiedAuthUser.user.email;

    // 2. Update the actual admin's email in Auth
    const { error: updateAuthError } = await supabaseClient.auth.admin.updateUserById(
      user.id,
      { email: newEmail, email_confirm: true }
    );
    if (updateAuthError) {
      return new Response(JSON.stringify({ error: updateAuthError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Update public.profiles
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        email: newEmail,
        email_verified: true,
      })
      .eq('id', user.id);

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Cleanup temporary user if it was a different user
    if (verifiedUserId !== user.id) {
      await supabaseClient.auth.admin.deleteUser(verifiedUserId);
    }

    return new Response(
      JSON.stringify({ success: true, email: newEmail }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
