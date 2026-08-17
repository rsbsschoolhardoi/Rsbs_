import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { KeyRound, ShieldCheck } from 'lucide-react';

const formSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function AdminResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the user arrives via a reset link.
    // We listen for that event first; if the session is already present (e.g. page
    // refresh after the event fired) we fall through to getSession().
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setVerifying(false);
        return;
      }
      // SIGNED_IN fires on PKCE code exchange — also valid for reset flow
      if (event === 'SIGNED_IN' && session) {
        setVerifying(false);
        return;
      }
    });

    // Also check if a session already exists (e.g. user refreshed the page
    // after AuthCallback already exchanged the code)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session) {
        setVerifying(false);
      } else {
        // Give the auth state change listener 3 s to receive the recovery event
        // before giving up and redirecting to login.
        const timer = setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (!s) {
              toast.error('Invalid or expired reset link. Please request a new one.');
              navigate('/rsbs-admin-access');
            }
          });
        }, 3000);
        return () => clearTimeout(timer);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password
      });

      if (error) throw error;

      toast.success('Password reset successful! Please login with your new password.');
      
      // Sign out to ensure they have to log in manually as per Requirement 7
      await supabase.auth.signOut();
      
      navigate('/rsbs-admin-access');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center space-y-2 animate-slide-up">
          <div className="bg-primary p-4 rounded-3xl shadow-xl shadow-primary/20 mb-4">
            <KeyRound className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Secure Reset</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Update Administrative Password</p>
        </div>

        <Card className="border shadow-2xl rounded-[2.5rem] bg-card overflow-hidden">
          <CardHeader className="space-y-1 p-8 pb-4">
            <CardTitle className="text-2xl font-black flex items-center gap-2 text-primary">
              <ShieldCheck className="w-7 h-7" />
              Reset Password
            </CardTitle>
            <CardDescription className="text-muted-foreground font-medium">
              Create a new secure password for your admin account
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest">New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" className="h-12 rounded-2xl border-muted bg-muted/20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest">Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" className="h-12 rounded-2xl border-muted bg-muted/20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg shadow-lg shadow-primary/20" disabled={loading}>
                  {loading ? 'Updating Password...' : 'Reset Password'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
