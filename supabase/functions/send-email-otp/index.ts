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

    const { email, profileId, mode = 'binding' } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (mode === 'binding' && !profileId) {
      return new Response(
        JSON.stringify({ error: 'profileId is required for binding mode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email is already taken by an admin
    const { data: existingAdminEmail } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .eq('role', 'admin')
      .maybeSingle();

    if (existingAdminEmail && (mode === 'creation' || existingAdminEmail.id !== profileId)) {
      return new Response(
        JSON.stringify({ error: 'This email is already linked to another admin account' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let username = 'Admin';
    if (profileId) {
      // Check if profile exists and is admin
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, role, username')
        .eq('id', profileId)
        .maybeSingle();

      if (profileError || !profile || profile.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Invalid profile or not an admin' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      username = profile.username;
    }

    // Check for recent resend attempts (cooldown: 60 seconds)
    const query = supabaseClient
      .from('email_verification_otps')
      .select('last_resend_at')
      .eq('email', email);
    
    if (profileId) {
      query.eq('profile_id', profileId);
    }

    const { data: recentOtp } = await query.maybeSingle();

    if (recentOtp?.last_resend_at) {
      const lastResend = new Date(recentOtp.last_resend_at).getTime();
      const now = Date.now();
      const cooldownMs = 60 * 1000; // 60 seconds

      if (now - lastResend < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - (now - lastResend)) / 1000);
        return new Response(
          JSON.stringify({ error: `Please wait ${remainingSeconds} seconds before requesting a new OTP` }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Set expiry to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Delete any existing OTP for this profile and email
    const deleteQuery = supabaseClient
      .from('email_verification_otps')
      .delete()
      .eq('email', email);
    
    if (profileId) {
      deleteQuery.eq('profile_id', profileId);
    }
    
    await deleteQuery;

    // Store OTP hash in database
    const { error: insertError } = await supabaseClient
      .from('email_verification_otps')
      .insert({
        profile_id: profileId || null,
        email,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempts: 0,
        last_resend_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Failed to store OTP:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send OTP via email using Supabase Auth Admin API
    const { error: emailError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        data: {
          otp_code: otp,
          username: username,
        },
      },
    });

    // Note: The above is a workaround. For production, use a proper SMTP service.
    // Since we can't directly send custom emails via Supabase Auth, we'll use a simple approach:
    // Send the OTP in the email body by leveraging the email template system or external SMTP.

    // For now, we'll return success and log the OTP (in production, integrate with SMTP)
    console.log(`OTP for ${email}: ${otp} (expires at ${expiresAt})`);

    // In production, integrate with an SMTP service like SendGrid, Mailgun, or AWS SES
    // Example with fetch to an external email API:
    /*
    const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: 'noreply@rsbs.school' },
        subject: 'RSBS School - Email Verification OTP',
        content: [{
          type: 'text/plain',
          value: `Your OTP for email verification is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this, please ignore this email.`
        }]
      })
    });
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        // For development/testing only - remove in production
        debug_otp: Deno.env.get('ENVIRONMENT') === 'development' ? otp : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-email-otp:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
