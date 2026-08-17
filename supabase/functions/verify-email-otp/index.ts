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

    const { email, profileId, otp } = await req.json();

    if (!email || !profileId || !otp) {
      return new Response(
        JSON.stringify({ error: 'Email, profileId, and OTP are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Retrieve OTP record for this profile and email
    const { data: otpRecord, error: otpError } = await supabaseClient
      .from('email_verification_otps')
      .select('otp_hash, expires_at, attempts, id')
      .eq('profile_id', profileId)
      .eq('email', email)
      .maybeSingle();

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: 'No verification record found. Please request a new OTP' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check attempt limits
    if (otpRecord.attempts >= 5) {
      return new Response(
        JSON.stringify({ error: 'Maximum attempts reached. Please request a new OTP' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiry
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);

    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: 'OTP has expired. Please request a new OTP' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash user-provided OTP to compare with stored hash
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const userOtpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Compare hashes
    if (userOtpHash !== otpRecord.otp_hash) {
      // Increment attempts
      const { error: updateError } = await supabaseClient
        .from('email_verification_otps')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      if (updateError) {
        console.error('Failed to increment attempts:', updateError);
      }

      return new Response(
        JSON.stringify({ error: 'Invalid OTP code. Please try again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OTP is valid - atomically update profile and set email_verified flag
    const { error: profileUpdateError } = await supabaseClient
      .from('profiles')
      .update({
        email: email,
        email_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (profileUpdateError) {
      console.error('Failed to update profile:', profileUpdateError);
      return new Response(
        JSON.stringify({ error: 'Verification successful, but failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cleanup: Delete OTP verification record after successful verification
    await supabaseClient
      .from('email_verification_otps')
      .delete()
      .eq('id', otpRecord.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email verified and updated successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-email-otp:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
