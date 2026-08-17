import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { GraduationCap, User, Lock, Eye, EyeOff, ClipboardList, CalendarCheck, MessageSquare, ChevronLeft, Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { AuthFormShell } from '@/components/auth/AuthFormShell';
import { AccountPickerScreen } from '@/components/auth/AccountPickerScreen';
import { useAccountPicker } from '@/hooks/useAccountPicker';
import type { SavedAccount } from '@/hooks/useAccountPicker';

const GRADIENT = 'bg-gradient-to-br from-[hsl(258,55%,28%)] via-[hsl(260,50%,40%)] to-[hsl(265,45%,54%)]';

const formSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export default function TeacherLogin() {
  const { signInWithUsername } = useAuth();
  const { accounts, removeAccount } = useAccountPicker('teacher');
  const [loading, setLoading] = useState(false);
  const [isSecondaryLoginEnabled, setIsSecondaryLoginEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      toast.error('Email login is currently disabled. Please use your Teacher ID.');
      return;
    }
    if (!isEmail && !/^RSBST\d+$/.test(values.username)) {
      toast.error('Invalid Teacher ID format (must be RSBST + Digits)');
      return;
    }
    setLoading(true);
    try {
      const { error } = await signInWithUsername(values.username, values.password);
      if (error) {
        toast.error(error.message || 'Invalid Credentials');
      } else {
        toast.success('Welcome Teacher');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Saved account selected:
   * • Valid persisted session for this user → route to PIN (no password needed).
   * • No / expired session → fall back to inline password re-entry.
   */
  const handlePickerSelect = async (acc: SavedAccount) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && session.user.id === acc.profileId) {
      // Session active — AuthContext / RouteGuard will navigate to PIN automatically.
      return;
    }
    setReauthAccount(acc);
    setView('reauth');
  };

  const reauthForm = useForm<{ password: string }>({ defaultValues: { password: '' } });

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

  if (accounts.length > 0 && view === 'picker') {
    return (
      <AccountPickerScreen
        accounts={accounts}
        role="teacher"
        gradientClass={GRADIENT}
        brandIcon={<GraduationCap />}
        brandTitle="Teacher Portal"
        idLabel="Use your assigned Teacher ID (RSBST + number). Need access? Contact your school administrator."
        onSelectAccount={handlePickerSelect}
        onUseAnother={() => setView('form')}
        onRemoveAccount={removeAccount}
        isProcessing={loading}
      />
    );
  }

  if (view === 'reauth' && reauthAccount) {
    return (
      <AuthLayout
        panel={
          <AuthBrandPanel
            gradientClass={GRADIENT}
            icon={<GraduationCap />}
            title="Teacher Portal"
            tagline="Take attendance, manage student records, and stay connected with your classroom."
            features={[
              { icon: <CalendarCheck />, text: 'Fast attendance marking' },
              { icon: <ClipboardList />, text: 'Class & timetable overview' },
              { icon: <MessageSquare />, text: 'Student queries & messages' },
            ]}
          />
        }
      >
        <AuthFormShell
          icon={<GraduationCap />}
          heading="Confirm your password"
          subheading={`Your session for ${reauthAccount.fullName} has expired. Please enter your password to continue.`}
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
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${GRADIENT}`}>
                {reauthAccount.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{reauthAccount.fullName}</p>
                <p className="text-xs font-mono text-primary truncate">{reauthAccount.loginId}</p>
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
                  Authenticating…
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
          icon={<GraduationCap />}
          title="Teacher Portal"
          tagline="Take attendance, manage student records, and stay connected with your classroom."
          features={[
            { icon: <CalendarCheck />, text: 'Fast attendance marking' },
            { icon: <ClipboardList />, text: 'Class & timetable overview' },
            { icon: <MessageSquare />, text: 'Student queries & messages' },
          ]}
        />
      }
    >
      <AuthFormShell
        icon={<GraduationCap />}
        heading="Teacher Sign In"
        subheading="Enter your Teacher ID and password to access your portal."
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
              Use your assigned Teacher ID (RSBST + number).
              <br />Need access? Contact your school administrator.
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
                    {isSecondaryLoginEnabled ? 'Teacher ID or Email' : 'Teacher ID'}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder={isSecondaryLoginEnabled ? 'RSBST1001 or email@school.edu' : 'RSBST + your number'}
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
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98] mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  Authenticating…
                </span>
              ) : (
                'Sign In to Teacher Portal'
              )}
            </Button>

          </form>
        </Form>
      </AuthFormShell>
    </AuthLayout>
  );
}
