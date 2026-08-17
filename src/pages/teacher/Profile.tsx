import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Teacher } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  BookOpen, 
  Calendar, 
  LogOut,
  Shield,
  GraduationCap
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ProfileTagBadge } from '@/components/ProfileTagBadge';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Sun, Globe, KeyRound } from 'lucide-react';
import { ChangePINDialog } from '@/components/auth/ChangePINDialog';
import { supabase } from '@/db/supabase';

export default function TeacherProfile() {
  const { profile, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  const teacherId = profile?.teacher_id;

  useEffect(() => {
    const fetchTeacher = async () => {
      if (!teacherId) return;
      try {
        const { data } = await api.getTeachers();
        const currentTeacher = data?.find(t => t.id === teacherId);
        if (currentTeacher) setTeacher(currentTeacher);
      } catch (err) {
        console.error("Fetch teacher error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacher();

    const channel = supabase
      .channel('teacher_profile_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'teachers',
        filter: `id=eq.${teacherId}`
      }, () => {
        fetchTeacher();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Teacher profile not found</p>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/teacher-login');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black uppercase tracking-widest text-primary">My Profile</h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Personal Details & Info</p>
      </div>

      {/* Profile Card */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden relative rounded-[2.5rem]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
        <CardContent className="p-8 text-center relative z-10">
          <Avatar className="w-24 h-24 mx-auto border-4 border-white/20 shadow-2xl mb-4">
            <AvatarImage src={teacher.profile_picture_url || ''} />
            <AvatarFallback className="bg-white/20 text-white font-black text-3xl">{teacher.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-xl font-black">
              {teacher.prefix && <span>{teacher.prefix} </span>}
              {teacher.name}
            </h2>
            <ProfileTagBadge tag={teacher.profile_tag} size="md" />
          </div>
          <p className="text-xs text-white/80 uppercase tracking-widest font-bold">{teacher.subject_role}</p>
          <div className="flex flex-col items-center gap-1 mt-2">
            <p className="text-[10px] text-white/50 font-mono tracking-widest uppercase">Login: {teacher.login_id}</p>
            <p className="text-[10px] text-white/50 font-mono tracking-widest uppercase">Employee ID: {teacher.employee_id || 'N/A'}</p>
            <p className="text-[10px] text-white/50 font-mono tracking-widest uppercase">Verification: {teacher.verification_id}</p>
          </div>
        </CardContent>
      </Card>

      {/* Info Sections */}
      <div className="grid gap-4">
        <Card className="border-none shadow-md rounded-[2rem] bg-card/50 backdrop-blur-sm border-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Professional Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Employee ID</p>
                <p className="text-sm font-bold font-mono uppercase tracking-widest text-primary">{teacher.employee_id || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Verification ID</p>
                <p className="text-sm font-bold font-mono uppercase tracking-widest text-primary">{teacher.verification_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Specialization</p>
                <p className="text-sm font-bold">{teacher.subject_role || 'General'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <GraduationCap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Description</p>
                <p className="text-sm font-bold">{teacher.description || 'Professional Educator'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Joining Date</p>
                <p className="text-sm font-bold">{teacher.joining_date ? new Date(teacher.joining_date).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md rounded-[2rem] bg-card/50 backdrop-blur-sm border-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" />
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Phone className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Mobile Number</p>
                <p className="text-sm font-bold">{teacher.contact}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Email Address</p>
                <p className="text-sm font-bold lowercase">{teacher.email || 'not provided'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card className="border-none shadow-md rounded-[2rem] bg-card/50 backdrop-blur-sm border-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <KeyRound className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-tight">Secondary PIN</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPinDialogOpen(true)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">
                Change PIN
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card className="border-none shadow-md rounded-[2rem] bg-card/50 backdrop-blur-sm border-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-primary" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <Sun className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-tight">{t('settings.theme')}</span>
              </div>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-tight">{t('settings.language')}</span>
              </div>
              <LanguageSwitcher />
            </div>
          </CardContent>
        </Card>
      </div>

      <Button 
        onClick={handleLogout}
        variant="destructive" 
        className="w-full h-14 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-destructive/20 transition-all active:scale-[0.98]"
      >
        <LogOut className="w-5 h-5 mr-3" />
        Logout Session
      </Button>
      
      <p className="text-[9px] text-center text-muted-foreground uppercase tracking-[0.2em] font-black opacity-40 py-4">
        RSBS SCHOOL MANAGEMENT SYSTEM v2.0
      </p>

      <ChangePINDialog 
        open={pinDialogOpen} 
        onOpenChange={setPinDialogOpen} 
      />
    </div>
  );
}
