import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { api } from '@/db/api';
import { toast } from 'sonner';
import { ShieldCheck, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const Verify: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const navigate = useNavigate();

  useEffect(() => {
    const handleVerification = async () => {
      try {
        // 1. Extract parameters from URL
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');
        const tokenHash = queryParams.get('token_hash');
        const type = queryParams.get('type');
        const token = queryParams.get('token');
        
        // Supabase often puts tokens in the hash for email links
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        // New requirement: handle custom admin verification token
        if (token) {
          const { data, error } = await api.verifyAdminToken(token);
          if (error) throw error;
          
          setStatus('success');
          setMessage(`Email ${data.email} verified successfully. You can now log in.`);
          toast.success('Verification successful!');
          
          // Requirement: Do NOT perform automatic login.
          await supabase.auth.signOut();
          
          setTimeout(() => {
            navigate('/rsbs-admin-access');
          }, 3000);
          return;
        }

        let session;

        if (tokenHash && type) {
          // New requirement: handle token_hash and type explicitly
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (error) throw error;
          session = data.session;
        } else if (code) {
          // PKCE flow
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          session = data.session;
        } else if (accessToken && refreshToken) {
          // Implicit flow
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          session = data.session;
        } else {
          // Check if we already have a session
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          session = data.session;
        }

        if (!session || !session.user) {
          throw new Error('Invalid or expired verification link.');
        }

        const user = session.user;

        // 3. Call Edge Function to finalize verification logic (e.g., merge users, setup profiles)
        // This handles both new admins and existing admins.
        const { error: finalizeError } = await supabase.functions.invoke('finalize-verification');
        
        if (finalizeError) {
          const errorMsg = await finalizeError?.context?.text();
          throw new Error(errorMsg || finalizeError.message);
        }

        setStatus('success');
        setMessage('Email verified successfully.');
        toast.success('Email verified successfully.');

        // Requirement: Do NOT perform automatic login. Redirect to login after a short delay.
        // We MUST sign out the session that the verification link automatically established.
        await supabase.auth.signOut();

        setTimeout(() => {
          navigate('/rsbs-admin-access');
        }, 3000);

      } catch (error: any) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(error.message || 'An error occurred during verification.');
        toast.error(error.message || 'Verification failed.');
      }
    };

    handleVerification();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
      <Card className="w-full max-w-md border-none shadow-xl rounded-3xl overflow-hidden bg-white">
        <div className="h-2 bg-primary w-full" />
        <CardHeader className="text-center pt-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            {status === 'loading' && <Loader2 className="w-8 h-8 text-primary animate-spin" />}
            {status === 'success' && <ShieldCheck className="w-8 h-8 text-primary" />}
            {status === 'error' && <AlertCircle className="w-8 h-8 text-destructive" />}
          </div>
          <CardTitle className="text-2xl font-black text-primary">Email Verification</CardTitle>
          <CardDescription className="font-medium">{message}</CardDescription>
        </CardHeader>
        
        <CardContent className="text-center px-8 pb-8">
          {status === 'loading' && (
            <div className="space-y-4">
              <p className="text-muted-foreground animate-pulse">Processing your authentication request...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-4">
              <p className="text-muted-foreground font-medium">You are being redirected to the login page or dashboard.</p>
              <div className="flex justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-6">
              <p className="text-muted-foreground">The verification link might be invalid, expired, or already used.</p>
              <div className="pt-2">
                <Button 
                  onClick={() => navigate('/rsbs-admin-access')}
                  variant="outline"
                  className="w-full h-12 rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-bold"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Request New Link / Login
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="bg-muted/30 border-t flex justify-center py-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
            RSBS School Management System Security
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Verify;
