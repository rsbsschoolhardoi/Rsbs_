import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { BookOpen, User, Lock, Eye, EyeOff, Calendar, CheckCircle2, Trophy, Megaphone, Sparkles, CreditCard, Bell, ChevronLeft, Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { AuthFormShell } from '@/components/auth/AuthFormShell';
import { AccountPickerScreen } from '@/components/auth/AccountPickerScreen';
import { useAccountPicker } from '@/hooks/useAccountPicker';
import type { SavedAccount } from '@/hooks/useAccountPicker';

const GRADIENT = 'bg-gradient-to-br from-[hsl(158,60%,22%)] via-[hsl(160,55%,32%)] to-[hsl(165,50%,44%)]';

const formSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export default function StudentLogin() {
  const { signInWithUsername, profile, loading: authLoading } = useAuth();
  const { accounts, removeAccount, switchAccount: switchSavedAccount } = useAccountPicker('student');
  const [loading, setLoading] = useState(false);
  const [isSecondaryLoginEnabled, setIsSecondaryLoginEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // 'picker' = account picker, 'form' = full login, 'reauth' = password fallback for a saved account
  const [view, setView] = useState<'picker' | 'form' | 'reauth'>('picker');
  const [reauthAccount, setReauthAccount] = useState<SavedAccount | null>(null);

  useEffect(() => {
    api.isGlobalModuleEnabled('secondary_login_id').then(setIsSecondaryLoginEnabled);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const isEmail = values.username.includes('@');
    if (isEmail && !isSecondaryLoginEnabled) {
      toast.error('Email login is currently disabled. Please use your Student ID.');
      return;
    }
    if (!isEmail && !/^RSBS\d+$/.test(values.username)) {
      toast.error('Invalid Student ID format (must be RSBS + Digits)');
      return;
    }
    setLoading(true);
    try {
      const { error } = await signInWithUsername(values.username, values.password);
      if (error) {
        toast.error('Invalid Login ID or Password');
      } else {
        toast.success('Successfully logged in');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Saved account selected:
   * 1. If this account has been trusted on this device, switch to it instantly.
   * 2. If not trusted, show inline password re-entry.
   */
  const handlePickerSelect = async (acc: SavedAccount) => {
    if (acc.pinVerified) {
      setLoading(true);
      try {
        await switchSavedAccount(acc.profileId);
        toast.success('Welcome back!');
      } catch (err: any) {
        toast.error(err.message || 'Could not switch account');
      } finally {
        setLoading(false);
      }
      return;
    }
    setReauthAccount(acc);
    setView('reauth');
  };

  /** Re-auth form submit (session expired fallback) */
  const reauthForm = useForm<{ password: string }>({
    defaultValues: { password: '' },
  });

  const onReauthSubmit = async ({ password }: { password: string }) => {
    if (!reauthAccount) return;
    setLoading(true);
    try {
      const { error } = await signInWithUsername(reauthAccount.username, password);
      if (error) {
        toast.error('Incorrect password. Please try again.');
      } else {
        toast.success('Welcome back!');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show Account Picker
  if (accounts.length > 0 && view === 'picker') {
    return (
      <AccountPickerScreen
        accounts={accounts}
        role="student"
        gradientClass={GRADIENT}
        brandIcon={<BookOpen />}
        brandTitle="Student Portal"
        idLabel="No account? Contact school administration to get your Student ID."
        currentProfileId={profile?.id}
        onSelectAccount={handlePickerSelect}
        onUseAnother={() => setView('form')}
        onRemoveAccount={removeAccount}
      />
    );
  }

  // Re-auth view — account is saved but not trusted, need password for this specific account
  if (view === 'reauth' && reauthAccount) {
    return (
      <AuthLayout
        panel={
          <AuthBrandPanel
            gradientClass={GRADIENT}
            icon={<BookOpen />}
            title="Student Portal"
            tagline="Access your grades, timetable, notices, and everything you need for school."
            features={[
              { icon: <Calendar />, text: 'Live timetable & attendance' },
              { icon: <Trophy />, text: 'Exam results & reports' },
              { icon: <Bell />, text: 'Instant school notices' },
            ]}
          />
        }
      >
        <AuthFormShell
          icon={<BookOpen />}
          heading="Confirm your password"
          subheading={`Continue to ${reauthAccount.fullName}'s account.`}
          footer={
            <button
              type="button"
              onClick={() => { setView('picker'); setReauthAccount(null); }}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline mx-auto"
            >
              <ChevronLeft className="w-3 h-3" /> Back to accounts
            </button>
          }
        >
          <form onSubmit={reauthForm.handleSubmit(onReauthSubmit)} className="space-y-4">
            {/* Read-only account chip */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${GRADIENT}`}>
                {reauthAccount.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{reauthAccount.fullName}</p>
                <p className="text-xs font-mono text-primary truncate">{reauthAccount.verificationId}</p>
              </div>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••"
                className="pl-10 pr-11 h-12 bg-muted/40 border-border focus-visible:ring-primary rounded-xl text-base"
                autoFocus
                {...reauthForm.register('password', { required: true })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : 'Continue'}
            </Button>
          </form>
        </AuthFormShell>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      panel={
        <AuthBrandPanel
          gradientClass={GRADIENT}
          icon={<BookOpen />}
          title="Student Portal"
          tagline="Access your grades, timetable, notices, and everything you need for school."
          features={[
            { icon: <Calendar />, text: 'Live timetable & attendance' },
            { icon: <Trophy />, text: 'Exam results & reports' },
            { icon: <Bell />, text: 'Instant school notices' },
          ]}
        />
      }
    >
      <AuthFormShell
        icon={<BookOpen />}
        heading="Welcome to Student Portal"
        subheading="Enter your school ID to open your dashboard, quizzes, AI study companion, and more."
        features={[
          { icon: <Calendar />, text: 'Timetable' },
          { icon: <CheckCircle2 />, text: 'Attendance' },
          { icon: <Trophy />, text: 'Results' },
          { icon: <Megaphone />, text: 'Notices' },
          { icon: <Sparkles />, text: 'Study AI' },
          { icon: <CreditCard />, text: 'Fees' },
        ]}
        footer={
          <div className="space-y-2 text-center">
            {accounts.length > 0 && (
              <button
                type="button"
                onClick={() => setView('picker')}
                className="text-xs font-semibold text-primary hover:underline block w-full"
              >
                ← Back to saved accounts
              </button>
            )}
            <p className="text-[11px] font-medium text-muted-foreground">
              No account? Contact school administration to get your Student ID.
            </p>
          </div>
        }
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {isSecondaryLoginEnabled ? 'Student ID or Email' : 'Student ID'}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder={isSecondaryLoginEnabled ? 'RSBS1001 or email@school.edu' : 'RSBS + your number'}
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
            <Button
              type="submit"
              disabled={loading || authLoading}
              className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98] mt-2"
            >
              {loading || authLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : (
                'Sign In to Student Portal'
              )}
            </Button>

          </form>
        </Form>
      </AuthFormShell>
    </AuthLayout>
  );
}
