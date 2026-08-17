/**
 * PINSetup — compact, premium mobile-first PIN creation screen.
 * Displays: profile photo → full name → verification ID → 4-box PIN inputs.
 * NEVER shows the Login ID.
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { PINInput } from '@/components/auth/PINInput';
import { KeyRound, LogOut, Loader2 } from 'lucide-react';

interface PINSetupProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const PINSetup: React.FC<PINSetupProps> = ({ onSuccess, onCancel }) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [mismatch, setMismatch] = useState(false);
  const { profile, updatePIN } = useAuth();

  const isFirstTime = !profile?.pin;
  const title = isFirstTime ? 'Create Your PIN' : 'Reset Your PIN';
  const subtitle = isFirstTime
    ? 'Choose a secure 4-digit PIN to protect your account.'
    : 'Your PIN has been reset. Please set a new secure 4-digit PIN.';

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

  // Step 1 complete — advance to confirm step
  const handleNewPinComplete = (val: string) => {
    setNewPin(val);
    if (val.length === 4) {
      setTimeout(() => setStep('confirm'), 120);
    }
  };

  // Step 2 — auto-submit when confirm reaches 4 digits
  const handleConfirmPinChange = async (val: string) => {
    setConfirmPin(val);
    setMismatch(false);
    if (val.length === 4) {
      if (val !== newPin) {
        setMismatch(true);
        toast.error('PINs do not match. Please try again.');
        setTimeout(() => {
          setStep('create');
          setNewPin('');
          setConfirmPin('');
          setMismatch(false);
        }, 800);
        return;
      }
      setLoading(true);
      const { error } = await updatePIN(val);
      setLoading(false);
      if (error) {
        toast.error(error.message || 'Failed to set PIN');
        setStep('create');
        setNewPin('');
        setConfirmPin('');
      } else {
        toast.success('PIN set successfully');
        onSuccess();
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-primary/6 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-[92%] max-w-[420px]"
      >
        <div className="bg-card rounded-3xl border border-border/50 shadow-xl shadow-black/8 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

          <div className="px-6 pt-7 pb-7 flex flex-col items-center gap-5">
            {/* Header */}
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <KeyRound className="w-3.5 h-3.5 text-primary" />
              {title}
            </div>

            {/* Profile photo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Avatar className="h-16 w-16 border-4 border-background shadow-lg ring-2 ring-primary/20">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-black text-lg">
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

            <p className="text-sm text-muted-foreground text-center -mt-1 text-pretty">
              {subtitle}
            </p>

            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-6 h-1.5 rounded-full transition-colors ${step === 'create' ? 'bg-primary' : 'bg-primary/30'}`} />
              <div className={`w-6 h-1.5 rounded-full transition-colors ${step === 'confirm' ? 'bg-primary' : 'bg-border/50'}`} />
            </div>

            {/* PIN boxes */}
            <div className="w-full flex flex-col items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {step === 'create' ? 'Enter New PIN' : 'Confirm PIN'}
              </p>
              {step === 'create' ? (
                <PINInput
                  key="create"
                  value={newPin}
                  onChange={handleNewPinComplete}
                  disabled={loading}
                  autoFocus
                />
              ) : (
                <PINInput
                  key="confirm"
                  value={confirmPin}
                  onChange={handleConfirmPinChange}
                  disabled={loading}
                  hasError={mismatch}
                  autoFocus
                />
              )}
            </div>

            {/* Manual submit fallback (only if not auto-submitted) */}
            {step === 'confirm' && confirmPin.length === 4 && (
              <Button
                disabled={loading || confirmPin.length !== 4}
                className="w-full h-12 rounded-2xl font-bold text-base shadow-md shadow-primary/20 transition-all duration-200 active:scale-[0.98]"
                onClick={() => handleConfirmPinChange(confirmPin)}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Set PIN'}
              </Button>
            )}

            {/* Back / Cancel */}
            {step === 'confirm' ? (
              <button
                type="button"
                onClick={() => { setStep('create'); setNewPin(''); setConfirmPin(''); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                ← Change PIN
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cancel &amp; Sign Out
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
