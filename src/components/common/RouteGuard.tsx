import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';
import { useContext } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
}

// Please add the pages that can be accessed without logging in to PUBLIC_ROUTES.
const PUBLIC_ROUTES = [
  '/', 
  '/gallery', 
  '/notices', 
  '/leadership', 
  '/about', 
  '/contact', 
  '/student-login', 
  '/teacher-login', 
  '/parent/login',
  '/rsbs-admin-access', 
  '/login',
  '/auth/verify',
  '/admin/verify',
  '/403', 
  '/404',
  '/verify',
  '/verify-pin',
  '/verify-otp',
  '/admin/verify-request',
];

function matchPublicRoute(path: string, patterns: string[]) {
  const normalizedPath = path.split('?')[0].replace(/\/$/, '') || '/';
  return patterns.some(pattern => {
    const normalizedPattern = pattern.split('?')[0].replace(/\/$/, '') || '/';
    if (normalizedPattern.includes('*')) {
      const regex = new RegExp('^' + normalizedPattern.replace('*', '.*') + '$');
      return regex.test(normalizedPath);
    }
    return normalizedPath === normalizedPattern;
  });
}

export function RouteGuard({ children }: RouteGuardProps) {
  const context = useContext(AuthContext);
  const user = context?.user;
  const profile = context?.profile;
  const loading = context?.loading;
  const isRestoringSession = context?.isRestoringSession;
  const checkAuthStatus = context?.checkAuthStatus;
  const navigate = useNavigate();
  const location = useLocation();

  const normalizedPath = location.pathname.replace(/\/$/, '') || '/';
  const isPublic = matchPublicRoute(location.pathname, PUBLIC_ROUTES) || location.pathname === '/verify';
  const isVerifyPinRoute = normalizedPath === '/verify-pin';
  const isVerifyOtpRoute = normalizedPath === '/verify-otp';
  const isLoginRoute =
    normalizedPath === '/student-login' ||
    normalizedPath === '/teacher-login' ||
    normalizedPath === '/parent/login' ||
    normalizedPath === '/rsbs-admin-access' ||
    normalizedPath === '/login';

  // Derive status — returns 'loading' while auth is initialising
  const status = checkAuthStatus ? checkAuthStatus() : 'loading';

  useEffect(() => {
    // Never act while auth is still restoring the initial session.
    // All checks below are guarded by this single condition.
    if (isRestoringSession || context === undefined || !checkAuthStatus) return;

    // 0. Restricted accounts
    if (status === 'restricted' && !isPublic) {
      toast.error('Your account is not yet activated. Please contact the system administrator.');
      context.signOut();
      return;
    }

    // 1. Unauthenticated users trying to access protected routes
    if (status === 'unauthenticated' && !isPublic) {
      if (location.pathname.startsWith('/admin')) navigate('/rsbs-admin-access', { replace: true });
      else if (location.pathname.startsWith('/teacher')) navigate('/teacher-login', { replace: true });
      else if (location.pathname.startsWith('/parent')) navigate('/parent/login', { replace: true });
      else if (location.pathname.startsWith('/student')) navigate('/student-login', { replace: true });
      else navigate('/', { replace: true });
      return;
    }

    if (user && profile) {
      // 2. Sequential verification redirects (login routes are treated as public,
      //    so a logged-in user is always moved forward to the correct step).
      if (status === 'need-verification') {
        navigate('/admin/verify-request', { replace: true });
        return;
      }

      if (status === 'need-pin' && !isVerifyPinRoute) {
        navigate('/verify-pin', { replace: true });
        return;
      }

      if (status === 'need-otp' && !isVerifyOtpRoute) {
        navigate('/verify-otp', { replace: true });
        return;
      }

      // 3. Fully authenticated user sitting on a verify or login page → move to dashboard
      if (status === 'authenticated') {
        if (isVerifyPinRoute || isVerifyOtpRoute || isLoginRoute) {
          if (profile.role === 'admin') navigate('/admin', { replace: true });
          else if (profile.role === 'teacher') navigate('/teacher', { replace: true });
          else if (profile.role === 'parent') navigate('/parent/dashboard', { replace: true });
          else navigate('/student', { replace: true });
          return;
        }
      }

      // 4. Role-based path protection
      if (location.pathname.startsWith('/admin') && profile.role !== 'admin') { navigate('/403', { replace: true }); return; }
      if (location.pathname.startsWith('/student') && profile.role !== 'student') { navigate('/403', { replace: true }); return; }
      if (location.pathname.startsWith('/teacher') && profile.role !== 'teacher') { navigate('/403', { replace: true }); return; }
      if (location.pathname.startsWith('/parent') && profile.role !== 'parent') { navigate('/403', { replace: true }); return; }
    }
  }, [user, profile, isRestoringSession, status, location.pathname, navigate, checkAuthStatus, isLoginRoute, isVerifyPinRoute, isVerifyOtpRoute]);

  // ── Render guards ─────────────────────────────────────────────────────────

  // Show the session-restoration spinner only when the app is genuinely
  // recovering an existing session after startup, reload, or refresh.
  // It must NOT appear during a normal password/PIN login flow.
  if (isRestoringSession && !isPublic) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Restoring your session…</p>
        </div>
      </div>
    );
  }

  // While the user is logged in but still needs PIN/OTP, do not render the
  // protected page behind it. The effect above will redirect to the right
  // verification route. This prevents hook-count mismatches in downstream
  // components that may conditionally render while auth state is settling.
  if (user && status !== 'authenticated' && !isPublic) {
    if (status === 'need-pin') {
      if (!isVerifyPinRoute) return null;
    } else if (status === 'need-otp') {
      if (!isVerifyOtpRoute) return null;
    }
  }

  return <>{children}</>;
}
