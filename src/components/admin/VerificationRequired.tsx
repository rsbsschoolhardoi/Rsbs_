import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, AlertCircle, Loader2, LogOut, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';

export function VerificationRequired() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // If dummy email, they shouldn't even be here, so we could auto-refresh
  const isDummyEmail = profile?.email?.endsWith('@miaoda.com');
  
  useEffect(() => {
    if (isDummyEmail) {
      refreshProfile();
    }
  }, [isDummyEmail, refreshProfile]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Log access denial once on mount
  useEffect(() => {
    if (profile?.id) {
      (supabase.from('verification_logs' as any) as any).insert({
        user_id: profile.id,
        email: profile.email,
        event_type: 'access_denied',
        metadata: { path: window.location.pathname }
      }).then(({ error }: any) => {
        if (error) console.error('Failed to log access denial:', error);
      });
    }
  }, [profile?.id]);

  const handleResendLink = async () => {
    if (!profile?.email) {
      toast.error('No email address associated with this account');
      return;
    }

    setLoading(true);
    try {
      // Use headless client to avoid session conflicts
      const { createClient } = await import('@supabase/supabase-js');
      const headless = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );

      const { error } = await headless.auth.signInWithOtp({ 
        email: profile.email, 
        options: { 
          shouldCreateUser: false,
          emailRedirectTo: 'https://app-aho9bv0iqbr5.appmedo.com/auth/verify' 
        } 
      });

      if (error) throw error;

      await (supabase.from('verification_logs' as any) as any).insert({
        user_id: profile.id,
        email: profile.email,
        event_type: 'link_sent',
        metadata: { source: 'blocking_ui' }
      });

      toast.success('Verification link sent successfully');
      setIsSent(true);
      setCountdown(60);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
        <div className="h-2 bg-amber-500 w-full" />
        <CardHeader className="text-center pt-8">
          <div className="mx-auto w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
            <Mail className="w-10 h-10 text-amber-600" />
          </div>
          <CardTitle className="text-3xl font-black text-primary">Verification Required</CardTitle>
          <CardDescription className="text-muted-foreground font-bold px-4">
            Email verification required. Please complete the verification process sent to your email.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 px-8 text-center pb-8">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-amber-800 leading-relaxed">
              Account activation required. Please contact a <span className="font-black underline decoration-amber-300">Master Administrator</span> to verify and activate your administrative account (<span className="font-black underline decoration-amber-300">{profile?.email}</span>).
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <Button 
              variant="outline" 
              onClick={refreshProfile}
              className="w-full h-12 rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-bold"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => signOut()}
              className="w-full h-12 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-bold flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out & Exit
            </Button>
          </div>
        </CardContent>
        
        <CardFooter className="bg-muted/30 border-t flex justify-center py-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">
            RSBS School Management System Security
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
