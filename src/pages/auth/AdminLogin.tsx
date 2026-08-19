import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  ShieldCheck, User, Mail, Eye, EyeOff, Lock,
  BarChart3, Users, Settings, KeyRound, CheckCircle2, AlertCircle, Info, Loader2,
} from 'lucide-react';
import { supabase } from '@/db/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { AuthFormShell } from '@/components/auth/AuthFormShell';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export default function AdminLogin() {
  const { signInWithUsername, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordInput, setForgotPasswordInput] = useState('');
  const [forgotPasswordDone, setForgotPasswordDone] = useState(false);
  const [forgotUsernameOpen, setForgotUsernameOpen] = useState(false);
  const [forgotUsernameLoading, setForgotUsernameLoading] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryResult, setRecoveryResult] = useState<{
    found: boolean;
    masked_username?: string;
    message: string;
  } | null>(null);
  const [isSecondaryLoginEnabled, setIsSecondaryLoginEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const secondaryRes = await api.isGlobalModuleEnabled('secondary_login_id');
      setIsSecondaryLoginEnabled(secondaryRes);
    };
    fetchData();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const { error } = await signInWithUsername(values.username, values.password);
      if (error) {
        if (error.message.includes('Please verify your email address first')) {
           // Requirement 2.2: Redirect to a dedicated verification request/resend page.
           toast.error(error.message);
           navigate('/admin/verify-request');
           return;
        }
        toast.error(error.message || 'Invalid Credentials');
      } else {
        toast.success('Welcome to Admin Panel');
        // Redirection is now handled centrally by RouteGuard
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) { toast.error(error.message || 'Google sign-in failed'); setGoogleLoading(false); }
  };

  const onForgotPassword = async () => {
    const input = forgotPasswordInput.trim();
    if (!input || input.length < 3) {
      toast.error(
        isSecondaryLoginEnabled
          ? 'Please enter a valid Admin Username or Email.'
          : 'Please enter your Admin Username.'
      );
      return;
    }

    setForgotPasswordLoading(true);
    try {
      let targetEmail = input.toLowerCase();
      let profile: { email?: string; email_verified?: boolean; is_master?: boolean; role?: string } | null = null;

      if (!targetEmail.includes('@')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (api as any).getProfileByUsername(input);
        profile = data;
        if (!profile?.email) throw new Error('No verified email address found for this Admin username.');
        targetEmail = profile.email!;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (api as any).getProfileByEmail(targetEmail);
        profile = data;
      }

      if (!profile || profile.role !== 'admin') {
        throw new Error('This operation is exclusively available for Admin accounts.');
      }
      if (!profile.email_verified && !profile.is_master) {
        throw new Error(
          'Password reset is unavailable — this email address has not been verified. ' +
          'Please contact your Master Admin to verify the account first.'
        );
      }

      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      if (error) throw error;

      setForgotPasswordDone(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset link.';
      toast.error(message);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const closeForgotPassword = () => {
    setForgotPasswordOpen(false);
    setForgotPasswordInput('');
    setForgotPasswordDone(false);
  };

  const onForgotUsername = async () => {
    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      toast.error('Please enter a valid admin email address.');
      return;
    }

    setForgotUsernameLoading(true);
    setRecoveryResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('forgot-username', {
        body: { email: recoveryEmail.trim().toLowerCase() },
      });

      if (error) throw error;

      setRecoveryResult({
        found: data?.found ?? false,
        masked_username: data?.masked_username,
        message: data?.message || 'Recovery request processed.',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to process username recovery.');
    } finally {
      setForgotUsernameLoading(false);
    }
  };

  const closeForgotUsername = () => {
    setForgotUsernameOpen(false);
    setRecoveryEmail('');
    setRecoveryResult(null);
  };

  return (
    <AuthLayout
      panel={
        <AuthBrandPanel
          gradientClass="bg-gradient-to-br from-primary via-primary/90 to-accent"
          icon={<ShieldCheck />}
          title="Admin Control Centre"
          tagline="Manage your institution with complete visibility, security, and control."
          features={[
            { icon: <BarChart3 />, text: 'Live dashboard analytics' },
            { icon: <Users />, text: 'Full staff & student oversight' },
            { icon: <Settings />, text: 'System-wide configuration' },
          ]}
        />
      }
    >
      <AuthFormShell
        icon={<ShieldCheck />}
        heading="Admin Sign In"
        subheading="Enter your admin credentials to access the management console."
        footer={
          <p className="text-center text-[11px] font-medium text-muted-foreground leading-relaxed">
            Access is restricted to verified administrators.
            <br />If locked out, contact your Master Admin.
          </p>
        }
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Username / ID */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {isSecondaryLoginEnabled ? 'Admin ID or Email' : 'Admin Username'}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder={isSecondaryLoginEnabled ? 'admin@school.edu or username' : 'Enter username'}
                        className="pl-10 h-12 bg-muted/40 border-border focus-visible:ring-primary rounded-xl text-sm"
                        autoComplete="username"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••"
                        className="pl-10 pr-11 h-12 bg-muted/40 border-border focus-visible:ring-primary rounded-xl text-sm"
                        autoComplete="current-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98] mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : (
                'Sign In to Admin Panel'
              )}
            </Button>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 py-1">
              <Separator className="flex-1" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">or</span>
              <Separator className="flex-1" />
            </div>

            {/* ── Google OAuth ── */}
            <Button
              type="button"
              variant="outline"
              disabled={googleLoading}
              onClick={handleGoogleSignIn}
              className="w-full h-12 rounded-xl font-bold border-border gap-2"
            >
              {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Continue with Google
            </Button>

            {/* Recovery links — prominent row below submit */}
            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => { setForgotUsernameOpen(true); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                Forgot username?
              </button>
              <span className="w-px h-4 bg-border" />
              <button
                type="button"
                onClick={() => { setForgotPasswordOpen(true); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Forgot password?
              </button>
            </div>
          </form>
        </Form>
      </AuthFormShell>

      {/* ── Forgot Password Dialog ── */}
      <Dialog open={forgotPasswordOpen} onOpenChange={(open) => { if (!open) closeForgotPassword(); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
              <KeyRound className="w-5 h-5 text-primary" />
              Reset Admin Password
            </DialogTitle>
            <DialogDescription>
              Enter your Admin username{isSecondaryLoginEnabled ? ' or registered email' : ''}. We'll
              send a secure reset link to your verified admin email address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {!forgotPasswordDone ? (
              <>
                {/* Info note about email verification requirement */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/50 border border-border">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Password reset is only available for admin accounts with a{' '}
                    <span className="font-semibold text-foreground">verified email address</span>.
                    If your email is unverified, contact the Master Admin.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fp-input" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {isSecondaryLoginEnabled ? 'Admin Username or Email' : 'Admin Username'}
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="fp-input"
                      placeholder={isSecondaryLoginEnabled ? 'username or admin@school.edu' : 'Enter your admin username'}
                      className="pl-10 h-12 bg-muted/40 rounded-xl text-sm"
                      value={forgotPasswordInput}
                      onChange={(e) => setForgotPasswordInput(e.target.value)}
                      disabled={forgotPasswordLoading}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onForgotPassword(); } }}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full h-12 rounded-xl font-bold"
                  onClick={onForgotPassword}
                  disabled={forgotPasswordLoading}
                >
                  {forgotPasswordLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                      Sending reset link…
                    </span>
                  ) : (
                    'Send Password Reset Link'
                  )}
                </Button>
              </>
            ) : (
              /* Success state */
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-bold text-foreground">Reset link sent!</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Check your registered admin email inbox. The link expires in{' '}
                    <span className="font-semibold text-foreground">15 minutes</span>.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 rounded-xl font-bold"
                  onClick={() => { setForgotPasswordDone(false); setForgotPasswordInput(''); }}
                >
                  Send to a different account
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" className="w-full h-11 rounded-xl font-medium" onClick={closeForgotPassword}>
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Forgot Username Dialog ── */}
      <Dialog open={forgotUsernameOpen} onOpenChange={(open) => { if (!open) closeForgotUsername(); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
              <User className="w-5 h-5 text-primary" />
              Recover Admin Username
            </DialogTitle>
            <DialogDescription>
              Enter the email address registered to your admin account. We'll show you a masked
              username hint if a verified admin account is found.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {!recoveryResult ? (
              <>
                {/* Info note */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/50 border border-border">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Username hints are only shown for accounts with a{' '}
                    <span className="font-semibold text-foreground">verified email address</span>.
                    If your account is unverified, contact the Master Admin.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="recovery-email" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Admin Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="recovery-email"
                      type="email"
                      placeholder="admin@school.edu"
                      className="pl-10 h-12 bg-muted/40 rounded-xl text-sm"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      disabled={forgotUsernameLoading}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onForgotUsername(); } }}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full h-12 rounded-xl font-bold"
                  onClick={onForgotUsername}
                  disabled={forgotUsernameLoading}
                >
                  {forgotUsernameLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                      Looking up…
                    </span>
                  ) : (
                    'Find My Username'
                  )}
                </Button>
              </>
            ) : recoveryResult.found ? (
              /* Found state */
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 p-5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-medium text-foreground">{recoveryResult.message}</p>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Your username hint</p>
                    <p className="text-3xl font-black text-primary font-mono tracking-wider">{recoveryResult.masked_username}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 rounded-xl font-bold"
                  onClick={() => { setRecoveryResult(null); setRecoveryEmail(''); }}
                >
                  Try another email
                </Button>
              </div>
            ) : (
              /* Not found state — clear explanation */
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 p-5 rounded-xl bg-muted/50 border border-border text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{recoveryResult.message}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This could mean the email is not registered, the account is not an admin, or the
                    email has not been verified yet. Contact your Master Admin for assistance.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 rounded-xl font-bold"
                  onClick={() => { setRecoveryResult(null); setRecoveryEmail(''); }}
                >
                  Try another email
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" className="w-full h-11 rounded-xl font-medium" onClick={closeForgotUsername}>
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  );
}
