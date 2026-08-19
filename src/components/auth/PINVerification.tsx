/**
 * PINVerification — compact, premium mobile-first PIN entry screen.
 * Displays: profile photo → full name → verification ID → 4-box PIN input.
 * NEVER shows the Login ID.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { PINInput } from '@/components/auth/PINInput';
import { ShieldCheck, LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PINVerificationProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const PINVerification: React.FC<PINVerificationProps> = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { verifyPIN, profile } = useAuth();

  const fullName: string = profile?.student_name
    || profile?.teacher_name
    || profile?.parent_name
    || profile?.username
    || '';

  const verificationId: string = profile?.verification_id || '';

  const avatarUrl = profile?.avatar_url || '';

  const initials = fullName
    ? fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : (profile?.username?.[0] ?? '?').toUpperCase();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pin.length !== 4) return;

    setLoading(true);
    setHasError(false);
    const result = await verifyPIN(pin);
    setLoading(false);

    if (result.success) {
      toast.success('PIN verified');
      onSuccess();
    } else {
      toast.error(result.message || 'Incorrect PIN');
      setHasError(true);
      setPin('');
    }
  };

  // Auto-submit when 4 digits are entered
  const handlePinChange = (val: string) => {
    setPin(val);
    setHasError(false);
    if (val.length === 4) {
      // Small delay so animation completes visually
      setTimeout(() => {
        verifyPIN(val).then(result => {
          if (result.success) {
            toast.success('PIN verified');
            onSuccess();
          } else {
            toast.error(result.message || 'Incorrect PIN');
            setHasError(true);
            setPin('');
          }
        });
      }, 120);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      {/* Subtle bg orb */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-primary/6 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-[92%] max-w-[420px]"
      >
        <div className="bg-card rounded-2xl border border-border/50 shadow-xl shadow-black/8 overflow-hidden">
          {/* Top accent strip */}
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

          <div className="px-6 pt-7 pb-7 flex flex-col items-center gap-5">
            {/* Shield icon — small, top */}
            <div className="flex items-center gap-1.5 text-xs font-bold font-medium text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Secure Verification
            </div>

            {/* Profile avatar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Avatar className="h-16 w-16 border-4 border-background shadow-lg ring-2 ring-primary/20">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            {/* Identity */}
            <div className="text-center -mt-1">
              <p className="font-bold text-base text-foreground leading-tight">{fullName}</p>
              {verificationId && (
                <p className="text-sm font-mono font-semibold text-primary mt-0.5">{verificationId}</p>
              )}
            </div>

            {/* Prompt */}
            <p className="text-sm text-muted-foreground text-center -mt-1">
              Enter your secure 4-digit PIN.
            </p>

            {/* PIN boxes */}
            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-5">
              <PINInput
                value={pin}
                onChange={handlePinChange}
                disabled={loading}
                hasError={hasError}
                autoFocus
              />

              <AnimatePresence>
                {hasError && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="text-xs text-destructive font-semibold -mt-2"
                  >
                    Incorrect PIN. Please try again.
                  </motion.p>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                disabled={loading || pin.length !== 4}
                className={cn(
                  'w-full h-12 rounded-2xl font-bold text-base shadow-md shadow-primary/20',
                  'transition-all duration-200 active:scale-[0.98]',
                )}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Verify PIN'
                )}
              </Button>
            </form>

            {/* Cancel */}
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium -mt-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cancel &amp; Logout
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
