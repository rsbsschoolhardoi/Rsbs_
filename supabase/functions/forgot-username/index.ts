import { createClient } from 'npm:@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function maskUsername(username: string): string {
  if (username.length <= 4) {
    return username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
  }
  return username.slice(0, 2) + '*'.repeat(username.length - 3) + username[username.length - 1]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not set')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { email } = await req.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new Error('A valid email address is required.')
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, username, role, email_verified, is_master, login_access_enabled, account_status')
      .eq('email', normalizedEmail)
      .eq('role', 'admin')
      .maybeSingle()

    if (profileError) {
      console.error('Profile lookup error:', profileError.message)
      throw new Error('Unable to process recovery request at this time.')
    }

    // Always return a generic message when no matching admin is found to avoid email enumeration.
    if (!profile) {
      return new Response(
        JSON.stringify({ found: false, message: 'If a verified admin account exists for this email, a recovery hint has been prepared.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Extra safety checks: only allow recovery for active, accessible admin accounts.
    if (profile.account_status === 'restricted' || profile.login_access_enabled === false) {
      return new Response(
        JSON.stringify({ found: false, message: 'This admin account is currently restricted. Please contact your Master Admin.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Require a verified email unless the user is a Master Admin.
    if (!profile.email_verified && !profile.is_master) {
      return new Response(
        JSON.stringify({ found: false, message: 'This email address has not been verified. Please contact your Master Admin.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    await supabaseClient.from('verification_logs').insert({
      user_id: profile.id,
      email: normalizedEmail,
      event_type: 'forgot_username_hint_requested',
      metadata: { source: 'admin_login', status: 'success' }
    })

    return new Response(
      JSON.stringify({
        found: true,
        masked_username: maskUsername(profile.username),
        message: 'We found an admin account registered to this email. Use the hint below to recall your username.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('Forgot Username Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
