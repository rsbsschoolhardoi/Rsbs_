import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParent } from '@/contexts/ParentContext';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, QrCode, CreditCard, Shield, User, Camera, Mail, Phone, Calendar, UserCheck, CheckCircle2 } from 'lucide-react';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import { generateStudentIDCard } from '@/utils/idCardGenerator';
import { StudentSwitcher } from '@/components/parent/StudentSwitcher';
import { ChangePINDialog } from '@/components/auth/ChangePINDialog';
import { toast } from 'sonner';

const ParentProfile: React.FC = () => {
  const { profile } = useAuth();
  const { selectedStudent, loading: parentLoading } = useParent();
  const [isDownloadingId, setIsDownloadingId] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  const handleDownloadIDCard = async () => {
    if (!selectedStudent?.student_id) {
      toast.error('Data not found. Please try again.');
      return;
    }
    setIsDownloadingId(true);
    try {
      const [studentRes, brandingRes] = await Promise.all([
        api.getStudentById(selectedStudent.student_id),
        api.getBrandingSettings()
      ]);
      
      const student = studentRes.data;
      const branding = brandingRes.data;
      
      if (!student || !branding) throw new Error('Student or branding not found');
      
      await generateStudentIDCard(student, branding);
      toast.success('ID Card downloaded successfully');
    } catch (error: any) {
      console.error('ID Card download failed:', error);
      toast.error('Failed to generate ID card');
    } finally {
      setIsDownloadingId(false);
    }
  };

  if (parentLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Updating profile records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <StudentSwitcher />

      {/* Selected Student Profile Header */}
      <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-xl shadow-slate-200/50 bg-white">
        <CardHeader className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 md:p-10">
          <div className="flex flex-col md:flex-row gap-8 items-center text-center md:text-left">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-[2rem] bg-white/10 flex items-center justify-center border border-white/20 overflow-hidden shadow-2xl">
                {selectedStudent?.profile_picture_url ? (
                  <img src={selectedStudent.profile_picture_url} alt={selectedStudent.student_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-white/50" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 p-2 bg-primary rounded-xl shadow-lg border-2 border-slate-900 group-hover:scale-110 transition-transform">
                <Shield className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-none rounded-lg text-[10px] font-black uppercase tracking-widest h-6 px-3">
                  Verification Active
                </Badge>
                <h3 className="text-3xl font-black tracking-tight">{selectedStudent?.student_name}</h3>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider">{selectedStudent?.student_class} - {selectedStudent?.student_section}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider">{selectedStudent?.student_type}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 md:p-10 space-y-10">
          {/* Detailed Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Academic Information</h4>
                <div className="space-y-2">
                  <InfoItem icon={User} label="Student Name" value={selectedStudent?.student_name} />
                  <InfoItem icon={UserCheck} label="Class & Section" value={`${selectedStudent?.student_class} - ${selectedStudent?.student_section}`} />
                  <InfoItem icon={Shield} label="Student Type" value={selectedStudent?.student_type} />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Contact Details</h4>
                <div className="space-y-2">
                  <InfoItem icon={Phone} label="Primary Contact" value={selectedStudent?.student_contact || 'Not provided'} />
                  <InfoItem icon={Mail} label="Academic Email" value={selectedStudent?.student_email || 'Not provided'} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Security Settings</h4>
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200/60 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Secondary PIN</p>
                    <p className="text-sm font-black text-slate-900">Active & Required</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPinDialogOpen(true)}
                  className="rounded-xl text-[10px] font-black uppercase tracking-widest border-2 hover:bg-primary hover:text-white transition-all"
                >
                  Change PIN
                </Button>
              </div>
            </div>
          </div>

          <div className="max-w-md mx-auto bg-slate-50 rounded-[2.5rem] border p-8 flex flex-col items-center text-center space-y-8">
            <div className="space-y-2">
              <div className="p-4 bg-primary/10 rounded-3xl inline-block">
                <QrCode className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-2xl font-black text-slate-900 leading-tight">Verification Code</h4>
              <p className="text-sm text-slate-500 font-medium">Official QR code for identity verification.</p>
            </div>

            <div className="p-6 bg-white rounded-[3rem] border shadow-inner">
              <QRCodeDataUrl 
                text={`${window.location.origin}/verify?id=${selectedStudent?.student_verification_id}`} 
                width={180}
              />
            </div>

            <div className="space-y-4 w-full">
              {selectedStudent?.id_card_visible && (
                <Button 
                  className="w-full rounded-2xl h-14 font-black uppercase tracking-widest shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-3 transition-all active:scale-95"
                  onClick={handleDownloadIDCard}
                  disabled={isDownloadingId}
                >
                  {isDownloadingId ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CreditCard className="h-6 w-6" />}
                  Download ID Card
                </Button>
              )}
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Secure Integrity System</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ChangePINDialog 
        open={pinDialogOpen} 
        onOpenChange={setPinDialogOpen} 
      />
    </div>
  );
};

const InfoItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-colors group">
    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
      <Icon className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
    </div>
    <div className="flex-1">
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">{label}</p>
      <p className="text-sm font-black text-slate-900 truncate">{value || '---'}</p>
    </div>
  </div>
);

export default ParentProfile;
