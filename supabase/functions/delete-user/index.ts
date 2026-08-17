import { createClient } from 'npm:@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { username, userId } = await req.json()
    console.log(`Request to delete user: username=${username} userId=${userId}`)

    if (!username && !userId) {
      throw new Error('Username or userId is required')
    }

    // Resolve target UUID — prefer the pre-resolved userId passed by the client.
    // Only fall back to a profiles lookup when only a username is provided.
    // Never use auth.admin.listUsers() — it is unreliable and unnecessary.
    let targetUserId: string | undefined = userId

    if (!targetUserId && username) {
      const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()

      if (profileError) {
        console.error('Profile lookup error:', profileError.message)
        throw new Error(`Failed to look up user profile: ${profileError.message}`)
      }

      targetUserId = profileData?.id
    }

    if (!targetUserId) {
      // User not found in profiles — treat as already deleted (idempotent)
      console.log('User not found in profiles, treating as already deleted.')
      return new Response(
        JSON.stringify({ message: 'User not found, nothing to delete' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log('Deleting auth user ID:', targetUserId)
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(targetUserId)

    if (deleteError) {
      console.error('auth.admin.deleteUser error:', deleteError.message)
      throw new Error(`Failed to delete auth user: ${deleteError.message}`)
    }

    console.log('User deleted successfully:', targetUserId)
    return new Response(
      JSON.stringify({ message: 'User deleted successfully', userId: targetUserId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Edge Function Error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
