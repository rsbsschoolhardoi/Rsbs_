/**
 * OAuth / Magic-Link / Password-Reset Callback Page
 *
 * Supabase redirects here after:
 *  - Google OAuth sign-in
 *  - Email magic-link / OTP link click
 *  - Password reset link click (type=recovery)
 *
 * For password-reset flows the page immediately navigates to the
 * dedicated AdminResetPassword page so the user can set a new password.
 * All other flows look up the user's role and redirect to the correct portal.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { getProfile } from '@/contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ROLE_HOME: Record<string, string> = {
  admin:   '/admin/dashboard',
  teacher: '/teacher/dashboard',
  parent:  '/parent/dashboard',
  student: '/student/dashboard',
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Keep the originally requested role across the OAuth flow so we can enforce
  // admin-only access when the user clicked "Continue with Google" on the
  // admin login page. This is purely a UI/authorization hint — it does not
  // grant any role; the profile's role is the source of truth.
  const [requestedRole, setRequestedRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        // ── Step 1: detect token type from URL params (PKCE / hash) ──────────
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const roleHint = url.searchParams.get('role');
        if (roleHint) setRequestedRole(roleHint);

        // Hash params are present for implicit-flow reset links
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashType   = hashParams.get('type');
        const accessToken  = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        // ── Step 2: exchange code / set session ──────────────────────────────
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        }

        if (cancelled) return;

        // ── Step 3: read the now-established session ─────────────────────────
        const { data: { session }, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.user) throw new Error('No active session found. The link may have expired.');

        // ── Step 4: password-reset flow → go to reset page ───────────────────
        // Detect via hash type (implicit) or Supabase recovery AMR claim
        const amr = (session.user as any)?.amr as Array<{ method: string }> | undefined;
        const isRecovery =
          hashType === 'recovery' ||
          amr?.some((a) => a.method === 'recovery') ||
          session.user.recovery_sent_at != null;

        if (isRecovery) {
          navigate('/admin/reset-password', { replace: true });
          return;
        }

        // ── Step 5: normal sign-in → role-based redirect ─────────────────────
        const profile = await getProfile(session.user.id);
        if (cancelled) return;

        // If the user came from the admin Google sign-in button, the profile must
        // belong to an authorized administrator. Google auth alone does not grant
        // admin access; we rely on the existing profiles role column.
        if (roleHint === 'admin' && profile?.role !== 'admin') {
          // Sign the unauthorized user out so they cannot access anything else.
          await supabase.auth.signOut();
          throw new Error('This Google account is not authorized as an RSBS School administrator.');
        }

        const role = profile?.role ?? 'student';
        const destination = ROLE_HOME[role] ?? '/';
        navigate(destination, { replace: true });
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Authentication failed.');
      }
    }

    handleCallback();
    return () => { cancelled = true; };
  }, [navigate]);

  const isAdminFlow = requestedRole === 'admin';

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold">Sign-in Failed</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            className="w-full rounded-xl"
            onClick={() =>
              navigate(isAdminFlow ? '/admin/login' : '/', { replace: true })
            }
          >
            {isAdminFlow ? 'Back to Admin Sign In' : 'Back to Home'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
        <p className="text-sm font-medium text-muted-foreground">Completing sign-in…</p>
      </div>
    </div>
  );
}
