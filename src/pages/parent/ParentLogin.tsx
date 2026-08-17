import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Users, User, Lock, Eye, EyeOff, CreditCard, Bell, BarChart2, ChevronLeft, Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { AuthFormShell } from '@/components/auth/AuthFormShell';
import { AccountPickerScreen } from '@/components/auth/AccountPickerScreen';
import { useAccountPicker } from '@/hooks/useAccountPicker';
import { useForm } from 'react-hook-form';
import type { SavedAccount } from '@/hooks/useAccountPicker';

const GRADIENT = 'bg-gradient-to-br from-[hsl(24,70%,28%)] via-[hsl(26,65%,38%)] to-[hsl(30,60%,52%)]';

const ParentLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSecondaryLoginEnabled, setIsSecondaryLoginEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<'picker' | 'form' | 'reauth'>('picker');
  const [reauthAccount, setReauthAccount] = useState<SavedAccount | null>(null);
  const { signInWithUsername } = useAuth();
  const { accounts, removeAccount } = useAccountPicker('parent');

  useEffect(() => {
    api.isGlobalModuleEnabled('secondary_login_id').then(setIsSecondaryLoginEnabled);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both your Parent ID and password.');
      return;
    }
    const isEmail = username.includes('@');
    if (isEmail && !isSecondaryLoginEnabled) {
      toast.error('Email login is currently disabled. Please use your Parent ID.');
      return;
    }
    if (!isEmail && !username.startsWith('RSBSP')) {
      toast.error('Invalid Parent ID. It must start with RSBSP.');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await signInWithUsername(username, password);
      if (!error) {
        toast.success('Welcome to the Parent Portal.');
      } else {
        toast.error(error.message || 'Invalid credentials. Please try again.');
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
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

  const onReauthSubmit = async ({ password: pw }: { password: string }) => {
    if (!reauthAccount) return;
    setIsLoading(true);
    try {
      const { error } = await signInWithUsername(reauthAccount.username, pw);
      if (error) {
        toast.error('Incorrect password. Please try again.');
      } else {
        toast.success('Welcome back!');
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (accounts.length > 0 && view === 'picker') {
    return (
      <AccountPickerScreen
        accounts={accounts}
        role="parent"
        gradientClass={GRADIENT}
        brandIcon={<Users />}
        brandTitle="Parent Portal"
        idLabel="Your Parent ID begins with RSBSP. Need access? Contact school administration."
        onSelectAccount={handlePickerSelect}
        onUseAnother={() => setView('form')}
        onRemoveAccount={removeAccount}
      />
    );
  }

  if (view === 'reauth' && reauthAccount) {
    return (
      <AuthLayout
        panel={
          <AuthBrandPanel
            gradientClass={GRADIENT}
            icon={<Users />}
            title="Parent Portal"
            tagline="Stay connected with your child's academic journey — fees, attendance, results, and more."
            features={[
              { icon: <BarChart2 />, text: 'Live attendance & progress' },
              { icon: <CreditCard />, text: 'Fee payments & statements' },
              { icon: <Bell />, text: 'School notices in real time' },
            ]}
          />
        }
      >
        <AuthFormShell
          icon={<Users />}
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
              disabled={isLoading}
              className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98]"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in…
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
          icon={<Users />}
          title="Parent Portal"
          tagline="Stay connected with your child's academic journey — fees, attendance, results, and more."
          features={[
            { icon: <BarChart2 />, text: 'Live attendance & progress' },
            { icon: <CreditCard />, text: 'Fee payments & statements' },
            { icon: <Bell />, text: 'School notices in real time' },
          ]}
        />
      }
    >
      <AuthFormShell
        icon={<Users />}
        heading="Parent Sign In"
        subheading="Enter your Parent ID and password to access your child's information."
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
              Your Parent ID begins with <span className="font-bold text-foreground">RSBSP</span>.
              <br />Need access? Contact school administration.
            </p>
          </div>
        }
      >
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="parent-username"
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              {isSecondaryLoginEnabled ? 'Parent ID or Email' : 'Parent ID'}
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="parent-username"
                placeholder={isSecondaryLoginEnabled ? 'RSBSP1001 or parent@email.com' : 'RSBSP + your number'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 h-12 bg-muted/40 border-border focus-visible:ring-primary rounded-xl text-sm"
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="parent-password"
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="parent-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-11 h-12 bg-muted/40 border-border focus-visible:ring-primary rounded-xl text-sm"
                autoComplete="current-password"
                disabled={isLoading}
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
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98] mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                Signing in…
              </span>
            ) : (
              'Sign In to Parent Portal'
            )}
          </Button>

        </form>
      </AuthFormShell>
    </AuthLayout>
  );
};

export default ParentLogin;
