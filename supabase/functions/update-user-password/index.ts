import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

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

    const { username, password } = await req.json()
    console.log(`Request to update user password: ${username}`)
    
    if (!username || !password) {
      throw new Error('Username and password are required')
    }

    const email = `${username}@miaoda.com`

    // Try to find the user in profiles table first as it's faster
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    
    if (profileError) {
      console.warn('Profile lookup error:', profileError.message)
    }

    let targetUserId = profileData?.id

    if (!targetUserId) {
      console.log('User not found in profiles, checking auth listing...')
      const { data: listData, error: listError } = await supabaseClient.auth.admin.listUsers({
        perPage: 1000
      })
      
      if (listError) {
        console.error('List users error:', listError.message)
        throw listError
      }

      const targetUser = listData.users.find(u => u.email === email)
      targetUserId = targetUser?.id
    }

    if (targetUserId) {
      console.log('User found, updating user ID:', targetUserId)
      const { data: updateData, error: updateError } = await supabaseClient.auth.admin.updateUserById(
        targetUserId,
        { password }
      )

      if (updateError) {
        console.error('Update user error:', updateError.message)
        throw updateError
      }

      return new Response(JSON.stringify({ data: updateData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      // Create new user if not found
      console.log('User not found anywhere, creating new user for email:', email)
      const { data: createData, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        user_metadata: { username },
        email_confirm: true,
      })
      
      if (createError) {
        console.error('Create user error:', createError.message)
        throw createError
      }
      
      return new Response(JSON.stringify({ data: createData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
  } catch (error) {
    console.error('Edge Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
