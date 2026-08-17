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
      return new Response(JSON.stringify({ error: 'Forbidden: Only Master Admins can create new admins.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Extract request body
    const { id, username, email, password, permissions, is_master, is_blue_tag, admin_custom_tag, login_access_enabled } = await req.json();

    if (!username || !email) {
      throw new Error('Username and email are required.');
    }

    const isNewUser = !id;
    let userId = id;
    let userResponse = null;

    if (id) {
      // 4a. Update existing user in Auth
      const updatePayload: any = {
        email: email.trim().toLowerCase(),
        user_metadata: { username, is_admin: 'true' }
      };
      if (password && password.trim().length >= 6) {
        updatePayload.password = password;
      }

      const { data: updatedUser, error: updateError } = await supabaseClient.auth.admin.updateUserById(
        id,
        updatePayload
      );

      if (updateError) throw updateError;
      userId = updatedUser.user.id;
      userResponse = updatedUser.user;
    } else {
      // 4b. Create the user in Auth
      if (!password) throw new Error('Password is required for new accounts.');
      
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, is_admin: 'true' }
      });

      if (createError) throw createError;
      userId = newUser.user.id;
      userResponse = newUser.user;
    }

    // 5. Upsert the profile in profiles table
    let finalPermissions = permissions || [];
    
    // Automatic permission assignment upon promotion to Master Admin or creation
    if (is_master) {
       // We need to fetch all modules to assign all permissions
       const { data: allModules } = await supabaseClient.from('modules').select('id');
       if (allModules) {
         finalPermissions = allModules.map(m => m.id);
       }
    }

    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: userId,
        role: 'admin',
        username,
        email: email.trim().toLowerCase(),
        permissions: finalPermissions,
        is_master: is_master || false,
        is_blue_tag: is_blue_tag || false,
        admin_custom_tag: admin_custom_tag || null,
        login_access_enabled: login_access_enabled ?? true,
        // Requirement 1 & 2: New admins start unverified and restricted
        email_verified: !isNewUser, 
        require_email_verification: true,
        account_status: isNewUser ? 'restricted' : undefined, // Only set to restricted on creation
      });

    if (profileError) {
      // If we just created the user, we should cleanup on failure
      if (isNewUser) await supabaseClient.auth.admin.deleteUser(userId);
      throw profileError;
    }

    // 5.5 Generate Magic Link for new users
    if (isNewUser) {
      try {
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

        const { error: tokenError } = await supabaseClient.from('verification_tokens').insert({
          user_id: userId,
          token: token,
          expires_at: expiresAt
        });

        if (tokenError) throw tokenError;

        const verificationLink = `https://app-aho9bv0iqbr5.appmedo.com/verify?token=${token}`;
        console.log(`[SECURITY DISPATCH] Verification Link for ${email}: ${verificationLink}`);
        // Log success
        await supabaseClient.from('verification_logs').insert({
          user_id: userId,
          email,
          event_type: 'verification_link_sent_on_creation',
          metadata: { link: verificationLink }
        });
      } catch (tokenErr) {
        console.error('Failed to generate/log verification token:', tokenErr);
        // We don't throw here to avoid failing the whole creation process if just logging failed, 
        // but since requirement 4 says "Absolutely prevent the display of success unless confirmed", 
        // we might actually want to throw if token creation failed.
        throw new Error('User created but failed to generate verification link.');
      }
    }

    // 6. Log success
    await supabaseClient.from('verification_logs').insert({
      user_id: userId,
      email,
      event_type: isNewUser ? 'admin_created_manually' : 'admin_updated_manually',
      metadata: { action_by: currentUser.id, username }
    });

    return new Response(
      JSON.stringify({ success: true, user: userResponse }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Create Admin Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
