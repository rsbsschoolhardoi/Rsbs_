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

    const results: any = {
      orphansDeleted: [],
      missingCreated: [],
      errors: []
    }

    // Task A: Identify and Delete Orphaned Student Logins
    console.log('Task A: Finding orphaned student logins...')
    const { data: orphans, error: orphansError } = await supabaseClient
      .from('profiles')
      .select('id, username, email, student_id')
      .eq('role', 'student')

    if (orphansError) throw orphansError

    for (const orphan of orphans) {
      // Check if student exists and is active
      let studentValid = false
      if (orphan.student_id) {
        const { data: studentData } = await supabaseClient
          .from('students')
          .select('id, status')
          .eq('id', orphan.student_id)
          .eq('status', 'active')
          .maybeSingle()
        if (studentData) studentValid = true
      }

      if (!studentValid) {
        console.log(`Deleting orphaned student account: ${orphan.username} (ID: ${orphan.id})`)
        const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(orphan.id)
        if (deleteError) {
          results.errors.push(`Failed to delete orphan ${orphan.username}: ${deleteError.message}`)
        } else {
          results.orphansDeleted.push(orphan.username)
        }
      }
    }

    // Task C: Identify and Delete Auth Users with no Profile (Orphans at Auth Level)
    console.log('Task C: Finding auth users with no profiles...')
    const { data: { users: authUsers }, error: authError } = await supabaseClient.auth.admin.listUsers({ perPage: 1000 })
    if (authError) throw authError

    for (const au of authUsers) {
      const { data: pData } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('id', au.id)
        .maybeSingle()
      
      if (!pData) {
        // This auth user has no profile!
        // We only delete if it's not a new user (created more than 5 mins ago)
        const createdTime = new Date(au.created_at).getTime()
        const now = new Date().getTime()
        if (now - createdTime > 5 * 60 * 1000) {
          console.log(`Deleting auth user with no profile: ${au.email} (ID: ${au.id})`)
          const { error: dError } = await supabaseClient.auth.admin.deleteUser(au.id)
          if (dError) results.errors.push(`Failed to delete auth orphan ${au.email}: ${dError.message}`)
          else results.orphansDeleted.push(`Auth Only: ${au.email}`)
        }
      }
    }
    console.log('Task B: Finding students missing logins...')
    const { data: students, error: studentsError } = await supabaseClient
      .from('students')
      .select('id, name, login_id, email, status')
      .eq('status', 'active')

    if (studentsError) throw studentsError

    for (const student of students) {
      // Check if profile exists
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('student_id', student.id)
        .eq('role', 'student')
        .maybeSingle()

      if (!profileData) {
        console.log(`Creating missing login for student: ${student.name} (ID: ${student.login_id})`)
        const username = student.login_id
        const password = 'rsbs' + student.login_id.replace(/\D/g, '') || 'rsbs123456'
        
        // Try personal email first, then fallback
        let email = (student.email && student.email.includes('@')) ? student.email : `${username.toLowerCase()}@miaoda.com`
        
        let { data: createData, error: createError } = await supabaseClient.auth.admin.createUser({
          email,
          password,
          user_metadata: { username, is_admin: 'false' },
          email_confirm: true,
        })

        if (createError && createError.message.includes('already been registered') && email !== `${username.toLowerCase()}@miaoda.com`) {
           // Fallback to internal email if personal one is taken
           console.log(`Email ${email} taken, falling back to internal for student ${student.name}`)
           email = `${username.toLowerCase()}@miaoda.com`
           const retry = await supabaseClient.auth.admin.createUser({
             email,
             password,
             user_metadata: { username, is_admin: 'false' },
             email_confirm: true,
           })
           createData = retry.data
           createError = retry.error
        }

        if (createError) {
          console.error(`Error creating login for ${student.name}:`, createError)
          results.errors.push(`Failed to create login for student ${student.name}: ${createError.message} (Email: ${email})`)
        } else {
          results.missingCreated.push(student.name)
        }
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Remediation Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
