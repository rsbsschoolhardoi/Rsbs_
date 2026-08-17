import { useEffect, useState } from 'react';
import { useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function VerifyStudent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const studentId = searchParams.get('id');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!studentId) {
        setLoading(false);
        setError(true);
        return;
      }

      try {
        const { data: studentData, error: fetchError } = await api.verifyStudent(studentId);
        if (fetchError || !studentData) {
          setError(true);
        } else {
          setData(studentData);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [studentId]);

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 md:p-8">
      {/* Verification Display Card */}
      <div className="w-full max-w-2xl">
        <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
          <div className="h-3 bg-primary w-full" />
          
          {/* Official Header */}
          <CardHeader className="text-center pt-12 pb-8 border-b border-muted/50">
            <div className="flex flex-col items-center space-y-4">
              {data?.school_logo_url && (
                <img src={data.school_logo_url} alt="School Logo" className="h-16 w-auto object-contain mb-2" />
              )}
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-primary uppercase tracking-tight">
                  {data?.school_name || 'RSBS School'}
                </h1>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/60">
                  Official Student Verification Portal
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-8 md:px-12 py-10 space-y-10">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-muted-foreground font-black uppercase tracking-widest animate-pulse">Authenticating Identity...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-destructive uppercase tracking-wide">Invalid or Not Found</h3>
                  <p className="text-muted-foreground font-bold mt-2">The provided Verification ID could not be verified by the school database.</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  className="rounded-2xl h-12 px-8 font-black uppercase tracking-widest border-2 hover:bg-destructive hover:text-white transition-all duration-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Home
                </Button>
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                {/* Student Identity Section */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                  {/* Profile Photo */}
                  <div className="relative shrink-0">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-4 border-muted/30 overflow-hidden bg-muted p-1">
                      {data.profile_picture_url ? (
                        <img 
                          src={data.profile_picture_url} 
                          alt={data.name} 
                          className="w-full h-full object-cover rounded-[2rem]"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary text-4xl font-black rounded-[2rem]">
                          {data.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Structured Details */}
                  <div className="flex-1 text-center md:text-left space-y-6 w-full">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 mb-1">Student Full Name</p>
                      <h2 className="text-3xl font-black text-foreground tracking-tight leading-tight uppercase">
                        {data.name}
                      </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      <VerificationField label="Verification ID" value={data.verification_id} />
                      <VerificationField label="Academic Session" value={data.session_info} />
                      <VerificationField label="Class / Grade" value={data.class} />
                      <VerificationField label="Section / Homeroom" value={data.section} />
                    </div>
                  </div>
                </div>

                {/* Verification Status Section */}
                <div className="bg-primary/5 rounded-[2rem] p-6 md:p-8 space-y-4 border border-primary/10">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Verification Status</span>
                    </div>
                    <Badge 
                      className={cn(
                        "rounded-xl px-4 py-1.5 font-black uppercase tracking-widest text-[10px]",
                        data.status === 'Active' 
                          ? "bg-green-500 hover:bg-green-500 text-white shadow-lg shadow-green-500/20" 
                          : "bg-destructive hover:bg-destructive text-white shadow-lg shadow-destructive/20"
                      )}
                    >
                      {data.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-muted-foreground leading-relaxed italic">
                    "This student is officially registered and verified under <span className="text-primary font-black not-italic">{data.school_name}</span>."
                  </p>
                </div>

                {/* Action Bar */}
                <div className="action-bar flex flex-col sm:flex-row gap-4 pt-4">
                  <Button 
                    variant="outline"
                    className="w-full rounded-2xl h-12 font-black uppercase tracking-widest border-2"
                    onClick={() => navigate('/')}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Button>
                </div>
              </div>
            )}
          </CardContent>

          {/* System Footer */}
          <div className="bg-muted/30 px-8 py-6 text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/80">
              Verified and Issued by {data?.school_name || 'RSBS School'}
            </p>
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground/40 italic">
              Powered by the RSBS School Management System · Academic Integrity Division
            </p>
          </div>
        </Card>
      </div>
      
      {/* Disclaimer */}
      <p className="mt-8 text-[9px] text-muted-foreground/50 text-center max-w-md font-medium uppercase tracking-widest leading-loose">
        This page serves as an official electronic verification of student identity. Unauthorized access or attempt to alter data is strictly prohibited.
      </p>
    </div>
  );
}

function VerificationField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</p>
      <p className="text-sm font-bold text-foreground truncate">{value || 'N/A'}</p>
    </div>
  );
}
