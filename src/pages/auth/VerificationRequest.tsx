import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { api } from '@/db/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Mail, ArrowLeft, RefreshCw, Send, ShieldCheck, MailWarning, Timer } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export default function VerificationRequest() {
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let interval: any;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cooldown]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (cooldown > 0) return;
    
    setLoading(true);
    try {
      // Phase A: Backend validation and rate limiting
      const { error: backendError } = await api.resendVerificationByEmail(values.email);
      if (backendError) throw backendError;
      
      // Phase A: Use supabase.auth.resetPasswordForEmail as mandated by specification
      // This ensures a real email is sent via Supabase's built-in mailer
      const { error: emailError } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: window.location.origin + '/admin/verify'
      });
      
      if (emailError) throw emailError;
      
      toast.success('Verification link sent! Please check your inbox.');
      setIsSent(true);
      setCooldown(60); // 60s cooldown mandated by specification
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 text-foreground animate-in fade-in duration-500">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="bg-primary/10 p-4 rounded-3xl mb-4">
            <MailWarning className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Email Verification</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Request Account Activation Link</p>
        </div>

        <Card className="border shadow-2xl rounded-[2.5rem] bg-card overflow-hidden border-primary/10">
          <CardHeader className="space-y-1 p-8 pb-4">
            <CardTitle className="text-2xl font-black flex items-center gap-2 text-primary">
              <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
              Resend Link
            </CardTitle>
            <CardDescription className="text-muted-foreground font-medium">
              Enter the email address associated with your admin account to receive a new verification magic link.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            {!isSent ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs uppercase tracking-widest">Administrative Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="admin@rsbs.school" className="pl-12 h-12 rounded-2xl border-muted bg-muted/20 focus-visible:ring-primary" {...field} disabled={loading} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg shadow-lg shadow-primary/20 transition-all active:scale-95" disabled={loading || cooldown > 0}>
                    {loading ? 'Processing...' : (
                      cooldown > 0 ? (
                        <>
                          <Timer className="w-5 h-5 mr-2 animate-spin" />
                          Wait {cooldown}s
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Send Magic Link
                        </>
                      )
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-6 text-center animate-in slide-in-from-bottom-4 duration-500">
                <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                  <ShieldCheck className="w-10 h-10 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-foreground">Check your inbox!</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    If an account exists for <span className="font-black underline decoration-primary/30">{form.getValues('email')}</span>, we've sent a new activation link. 
                    Links are valid for <span className="font-bold text-primary">15 minutes</span>.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsSent(false)} 
                  className="w-full h-12 rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try another email
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 p-8 pt-0">
            <Button 
              variant="ghost" 
              className="w-full h-12 rounded-xl text-muted-foreground hover:text-primary font-bold transition-all"
              onClick={() => navigate('/rsbs-admin-access')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin Login
            </Button>
          </CardFooter>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">
          © 2026 RSBS School Security System
        </p>
      </div>
    </div>
  );
}
