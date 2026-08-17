import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, RefreshCw } from 'lucide-react';

export default function StudentVerifyOTP() {
  const { profile, sendOTP, verifyOTP, refreshProfile, shouldRequireOTP } = useAuth();
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const maskEmail = (email: string) => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const local = parts[0];
    const domain = parts[1];
    // Requirement 6: Display j***n@domain.com format
    if (local.length <= 1) return `*@${domain}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  };

  const handleSendOTP = useCallback(async (isAuto = false) => {
    setResendLoading(true);
    try {
      const result = await sendOTP();
      if (result.success && result.email) {
        setMaskedEmail(maskEmail(result.email));
        setCooldown(30); // Requirement 6.2: 30-second cooldown
        if (!isAuto) toast.success('OTP sent to your registered email');
      } else if (result.cooldown) {
        if (!isAuto) toast.error(result.message || 'Please wait before requesting a new code');
        setCooldown(Math.ceil(result.cooldown));
        if (isAuto && profile?.email) {
          setMaskedEmail(maskEmail(profile.email));
        }
      } else {
        if (!isAuto) toast.error(result.message || 'Failed to send OTP');
      }
    } catch (err) {
      if (!isAuto) toast.error('An unexpected error occurred during OTP dispatch');
    } finally {
      setResendLoading(false);
    }
  }, [sendOTP, profile?.email]);

  useEffect(() => {
    const init = async () => {
      // Requirement 11: Safety check
      const required = await shouldRequireOTP();
      if (!required) {
        // Redirection handled by RouteGuard
        return;
      }

      // Requirement 6: Auto-generate on mount
      handleSendOTP(true);
    };
    init();
  }, [handleSendOTP, shouldRequireOTP]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTP(otp);
      if (result.success) {
        toast.success('OTP verified successfully');
        await refreshProfile();
        // RouteGuard will handle redirection based on updated state
      } else {
        // Requirement 8: Expired OTP auto-resend
        if (result.message?.toLowerCase().includes('expired')) {
          toast.info('OTP has expired. Sending a new one...');
          setOtp('');
          await handleSendOTP();
        } else {
          toast.error(result.message || 'Invalid OTP');
          if (result.remainingAttempts !== undefined) {
            toast.info(`Remaining attempts: ${result.remainingAttempts}`);
          }
        }
      }
    } catch (err) {
      toast.error('Verification failed due to a system error');
    } finally {
      setLoading(false);
    }
  };

  const handleBypass = async () => {
    // Azad Bypass (Requirement 1.2)
    if (profile?.username === 'Azad') {
      toast.success('OTP bypassed by Master Admin');
      await verifyOTP('bypass'); // Centralized bypass in verifyOTP logic
      await refreshProfile();
      // RouteGuard will handle redirection
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="bg-primary p-4 rounded-3xl shadow-xl shadow-primary/20 mb-4">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-primary">Secure Verification</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">RSBS Multi-Factor Access</p>
        </div>

        <Card className="border shadow-2xl rounded-[2.5rem] bg-card overflow-hidden border-primary/10">
          <CardHeader className="space-y-1 p-8 pb-4">
            <CardTitle className="text-2xl font-black text-foreground text-center">Enter Code</CardTitle>
            <CardDescription className="text-muted-foreground font-medium text-center">
              {maskedEmail ? `A verification code was sent to ${maskedEmail}` : 'Preparing your verification code...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-center">
                <Input 
                  type="text" 
                  placeholder="000000" 
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="h-16 w-full max-w-[240px] rounded-2xl border-primary/20 bg-primary/5 text-center text-4xl font-black tracking-[0.5em] focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground/30" 
                />
              </div>
            </div>

            <Button 
              onClick={handleVerify} 
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg shadow-lg shadow-primary/20" 
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'Verifying...' : 'Complete Access'}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted/30" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-3 text-muted-foreground font-black tracking-widest">or</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => handleSendOTP()}
                className="w-full h-12 rounded-2xl border-primary/20 text-primary hover:bg-primary/5 font-bold shadow-sm transition-all active:scale-95" 
                disabled={resendLoading || cooldown > 0}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${resendLoading ? 'animate-spin' : ''}`} />
                {cooldown > 0 ? `Resend in ${cooldown}s` : resendLoading ? 'Sending...' : 'Resend Code'}
              </Button>

              {profile?.username === 'Azad' && (
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={handleBypass}
                  className="w-full h-12 rounded-2xl font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all" 
                >
                  Bypass OTP (Master Admin)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
