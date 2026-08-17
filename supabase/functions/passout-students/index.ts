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

    // Get the student IDs from request
    const { studentIds } = await req.json()
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new Error('Student IDs array is required')
    }

    console.log(`Request to mark as pass-out for ${studentIds.length} students`)

    // 1. Update students table
    const { error: studentError } = await supabaseClient
      .from('students')
      .update({ 
        status: 'passout', 
        passout_date: new Date().toISOString(),
        is_blocked: true,
        block_reason: 'Passed Out'
      })
      .in('id', studentIds)

    if (studentError) {
      console.error('Update students error:', studentError.message)
      throw studentError
    }

    // 2. Invalidate active sessions in student_sessions table
    const { error: sessionError } = await supabaseClient
      .from('student_sessions')
      .update({ status: 'forced_logout' })
      .in('student_id', studentIds)
      .eq('status', 'active')

    if (sessionError) {
      console.error('Update sessions error:', sessionError.message)
      // We don't throw here to avoid failing the whole process if session update fails
    }

    // 3. Optional: Block or delete profiles to prevent future logins
    // For this implementation, we'll just rely on the student status and is_blocked flag
    // which should be checked during the login process.

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${studentIds.length} students marked as pass-out successfully` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Edge Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
