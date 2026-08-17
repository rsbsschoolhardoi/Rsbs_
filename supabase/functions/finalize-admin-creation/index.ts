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

    // 1. Verify the caller is an authenticated Master Admin
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: callerProfile } = await supabaseClient.from('profiles').select('is_master').eq('id', caller.id).single();
    if (!callerProfile?.is_master) {
       return new Response(JSON.stringify({ error: 'Only Master Admins can finalize admin accounts' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { userId, username, password, permissions, is_master, is_blue_tag } = await req.json();

    if (!userId || !username || !password) {
      return new Response(JSON.stringify({ error: 'userId, username, and password are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Identify the target user. If the username belongs to an existing profile, update that.
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('id, email')
      .eq('username', username)
      .maybeSingle();

    const { data: newUser } = await supabaseClient.auth.admin.getUserById(userId);
    const verifiedEmail = newUser.user?.email;

    if (!verifiedEmail) throw new Error('Could not get verified email from verification session');

    let targetUserId = userId;
    const updateData: any = {
      user_metadata: { username, is_admin: 'true' }
    };
    if (password && password !== 'current_password_remains_the_same') {
      updateData.password = password;
    }

    if (existingProfile && existingProfile.id !== userId) {
      // Binding new verified email to an existing admin account
      console.log('Merging verified email into existing profile:', existingProfile.id);
      
      const { error: updateAuthError } = await supabaseClient.auth.admin.updateUserById(
        existingProfile.id,
        { 
          email: verifiedEmail,
          email_confirm: true,
          ...updateData
        }
      );

      if (updateAuthError) throw updateAuthError;

      // Delete the temporary user created during headless verification
      await supabaseClient.auth.admin.deleteUser(userId);
      targetUserId = existingProfile.id;
    } else {
      // Finalizing new admin creation
      const { error: updateAuthError } = await supabaseClient.auth.admin.updateUserById(
        userId,
        updateData
      );
      if (updateAuthError) throw updateAuthError;
    }

    // 3. Upsert the profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: targetUserId,
        role: 'admin',
        username: username,
        permissions: permissions || [],
        is_master: is_master || false,
        is_blue_tag: is_blue_tag || false,
        email: verifiedEmail,
        email_verified: true,
        require_email_verification: true,
      });

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(
      JSON.stringify({ success: true, userId: targetUserId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Finalize Admin Creation Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
