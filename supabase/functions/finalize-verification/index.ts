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

    // 1. Authenticate the verified user
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const email = user.email;
    if (!email) throw new Error('No email found for user');

    // 2. Check for pending admin data
    const { data: pendingAdmin, error: pendingError } = await supabaseClient
      .from('pending_admins')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (pendingError) console.error('Pending lookup error:', pendingError);

    let targetUserId = user.id;

    if (pendingAdmin) {
      // Case: New Admin Creation or Email Change
      console.log('Processing pending admin verification for:', email);

      // 3. Find if there's an existing profile (for merging)
      const { data: existingProfile } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('username', pendingAdmin.username)
        .maybeSingle();

      if (existingProfile && existingProfile.id !== user.id) {
        // Merging into existing account
        console.log('Merging verified email into existing profile:', existingProfile.id);
        
        await supabaseClient.auth.admin.updateUserById(
          existingProfile.id,
          { 
            email: email,
            email_confirm: true,
            user_metadata: { username: pendingAdmin.username, is_admin: 'true' }
          }
        );

        // Delete the temporary user created by Magic Link
        await supabaseClient.auth.admin.deleteUser(user.id);
        targetUserId = existingProfile.id;
      } else {
        // New user or same user ID — confirm email in auth.users so signInWithPassword works
        await supabaseClient.auth.admin.updateUserById(
          user.id,
          {
            email_confirm: true,
            user_metadata: { username: pendingAdmin.username, is_admin: 'true' }
          }
        );
      }

      // 4. Upsert the profile
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: targetUserId,
          role: 'admin',
          username: pendingAdmin.username,
          permissions: pendingAdmin.permissions || [],
          is_master: pendingAdmin.is_master || false,
          is_blue_tag: pendingAdmin.is_blue_tag || false,
          admin_custom_tag: pendingAdmin.admin_custom_tag || null,
          login_access_enabled: pendingAdmin.login_access_enabled ?? true,
          email: email,
          email_verified: true,
          require_email_verification: true,
          account_status: 'active', // Activate upon successful verification
        });

      if (profileError) throw profileError;

      // 5. Cleanup pending admin
      await supabaseClient.from('pending_admins').delete().eq('email', email);

    } else {
      // Case: Existing admin verifying their current email
      console.log('Verifying existing admin profile for:', email);
      
      // Requirement: Verification activates the account (Phase C: Post-Verification Access Control)
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          email_verified: true,
          account_status: 'active', // Activate the account upon successful verification
        })
        .eq('id', user.id);

      if (profileError) throw profileError;
    }

    // 6. Log success
    await supabaseClient.from('verification_logs').insert({
      user_id: targetUserId,
      email: email,
      event_type: 'verification_success',
      metadata: { source: pendingAdmin ? 'new_admin_or_email_change' : 'existing_admin_verification' }
    });

    return new Response(
      JSON.stringify({ success: true, userId: targetUserId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Finalize Verification Error:', error.message);
    
    // Attempt to log failure if we have enough context
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabaseClient.from('verification_logs').insert({
        event_type: 'verification_failure',
        metadata: { error: error.message }
      });
    } catch (logError) {
      console.error('Failed to log verification failure:', logError);
    }

    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
