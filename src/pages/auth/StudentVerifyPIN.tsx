import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PINVerification } from '@/components/auth/PINVerification';
import { PINSetup } from '@/components/auth/PINSetup';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function StudentVerifyPIN() {
  const { profile, isPinVerified, isRestoringSession, refreshProfile, signOut, shouldRequireOTP } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = React.useState(false);

  // Only block while the app is restoring an existing session on startup/reload.
  // During a normal login the verify page renders immediately so the PIN route
  // opens without the confusing "Restoring your session" message.
  if (isRestoringSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // No profile yet — RouteGuard will redirect to login
  if (!profile) return null;

  const redirectToDashboard = () => {
    if (profile.role === 'teacher') navigate('/teacher', { replace: true });
    else if (profile.role === 'parent') navigate('/parent/dashboard', { replace: true });
    else navigate('/student', { replace: true });
  };

  const onSuccess = async () => {
    setSubmitting(true);
    try {
      await refreshProfile();
      // Check if OTP is also required; if not, go straight to dashboard.
      // RouteGuard will handle the OTP redirect if needed.
      const otpNeeded = await shouldRequireOTP(profile);
      if (!otpNeeded) {
        redirectToDashboard();
      }
      // If OTP is needed, RouteGuard will redirect to /verify-otp automatically.
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = async () => {
    await signOut();
  };

  // PIN needs to be set up first
  if (profile.pin_setup_required || !profile.pin) {
    return <PINSetup onSuccess={onSuccess} onCancel={onCancel} />;
  }

  // PIN not yet verified in this session — show verification form
  if (!isPinVerified) {
    return <PINVerification onSuccess={onSuccess} onCancel={onCancel} />;
  }

  // PIN already verified (page-refresh scenario where sessionStorage was set).
  // RouteGuard will handle redirecting to the dashboard; show a brief spinner
  // instead of the confusing "PIN Already Verified" static page.
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}
