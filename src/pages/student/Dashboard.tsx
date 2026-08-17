import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Student, Attendance, Exam, Certificate } from '@/types';
import { BrandingSettings } from '@/types';
import { generateStudentIDCard } from '@/utils/idCardGenerator';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  Megaphone, 
  CheckCircle2, 
  Trophy, 
  TrendingUp, 
  Phone,
  User,
  RefreshCw,
  FileText,
  Download,
  CreditCard,
  QrCode
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
export default function StudentDashboard() {
  const { profile, signOut } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [settings, setSettings] = useState<{cert: boolean, id: boolean}>({cert: true, id: true});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isDownloadingId, setIsDownloadingId] = useState(false);
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const studentRef = useRef(student);
  const resolvedIdRef = useRef(resolvedId);

  useEffect(() => { studentRef.current = student; }, [student]);
  useEffect(() => { resolvedIdRef.current = resolvedId; }, [resolvedId]);

  const studentId = profile?.student_id;

  const resolveStudentId = useCallback(async () => {
    if (studentId) return studentId;
    if (!profile?.username) return null;
    // Fallback: some student profiles are linked by username/login_id instead of the student_id column
    const { data, error } = await supabase
      .from('students')
      .select('id')
      .eq('login_id', profile.username)
      .maybeSingle();
    if (error) {
      console.error('Failed to resolve student by login_id:', error);
      return null;
    }
    const typedData = data as { id: string } | null;
    return typedData?.id || null;
  }, [studentId, profile?.username]);

  const loadOnce = useCallback(async () => {
    if (resolvedIdRef.current && studentRef.current) return;
    setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const id = await resolveStudentId();
      setResolvedId(id);
      if (!id) {
        setError('Student profile not found. Please log in again or contact support.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data: studentData, error: studentError } = await api.getStudentById(id);
      if (studentError || !studentData) {
        console.error('Student fetch error:', studentError);
        const detail = studentError?.message ? `: ${studentError.message}` : '';
        setError(`Student profile not found${detail}. Please log in again or contact support.`);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [attendanceRes, examRes, certRes, brandingRes, globalSettings] = await Promise.all([
        api.getAttendance(id),
        api.getStudentExams(studentData),
        api.getCertificateByStudent(id, 'certificate'),
        api.getBrandingSettings(),
        Promise.all([
          api.getGlobalModuleSetting('certificate_download'),
          api.getGlobalModuleSetting('id_card_download')
        ])
      ]);
      setStudent(studentData);
      setAttendance(attendanceRes.data);
      setExams(examRes.data);
      setCertificate(certRes.data);
      setBranding(brandingRes.data);
      setSettings({
        cert: globalSettings[0].data?.is_enabled ?? true,
        id: globalSettings[1].data?.is_enabled ?? true
      });
      setLoading(false);
    } catch (err) {
      console.error('Dashboard load failed:', err);
      setError('Unable to load dashboard. Please try again.');
      setLoading(false);
      toast.error('Failed to load dashboard data');
    } finally {
      setRefreshing(false);
    }
  }, [resolveStudentId]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const id = await resolveStudentId();
      setResolvedId(id);
      if (!id) {
        setError('Student profile not found. Please log in again or contact support.');
        setRefreshing(false);
        return;
      }
      const { data: studentData, error: studentError } = await api.getStudentById(id);
      if (studentError || !studentData) {
        console.error('Student refresh error:', studentError);
        setRefreshing(false);
        return;
      }
      const [attendanceRes, examRes, certRes, brandingRes, globalSettings] = await Promise.all([
        api.getAttendance(id),
        api.getStudentExams(studentData),
        api.getCertificateByStudent(id, 'certificate'),
        api.getBrandingSettings(),
        Promise.all([
          api.getGlobalModuleSetting('certificate_download'),
          api.getGlobalModuleSetting('id_card_download')
        ])
      ]);
      setStudent(studentData);
      setAttendance(attendanceRes.data);
      setExams(examRes.data);
      setCertificate(certRes.data);
      setBranding(brandingRes.data);
      setSettings({
        cert: globalSettings[0].data?.is_enabled ?? true,
        id: globalSettings[1].data?.is_enabled ?? true
      });
    } catch (err) {
      console.error('Dashboard refresh failed:', err);
      setError('Unable to refresh dashboard. Please try again.');
      toast.error('Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  }, [resolveStudentId]);

  // Prevent an infinite spinner if the profile is not available
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && !studentId) {
        setLoading(false);
        setError('Profile not available. Please log in again.');
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading, studentId]);

  useEffect(() => {
    loadOnce();

    if (!resolvedId) return;

    // Listen for real-time updates from AuthContext (Unified mechanism)
    const handleAttendanceUpdate = (e: any) => {
      // Check if update is relevant to this student
      if (e.detail?.new?.student_id === resolvedId || !e.detail?.new?.student_id) {
        refreshData();
      }
    };

    const handleNoticeUpdate = () => refreshData();
    const handleTimetableUpdate = () => refreshData();
    const handleStudentDataUpdate = (e: any) => {
      if (e.detail?.id === resolvedId) {
        setStudent(e.detail);
        refreshData(); // Full refresh
      }
    };

    const handleModuleSettingsUpdate = () => {
      refreshData();
    };

    window.addEventListener('attendance-updated', handleAttendanceUpdate);
    window.addEventListener('notices-updated', handleNoticeUpdate);
    window.addEventListener('timetable-updated', handleTimetableUpdate);
    window.addEventListener('student-data-updated', handleStudentDataUpdate);
    window.addEventListener('module-settings-updated', handleModuleSettingsUpdate);

    // Keep existing student-specific listeners if they handle something extra
    const channel = supabase
      .channel('student-dashboard-specific')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'certificates',
        filter: `student_id=eq.${resolvedId}`
      }, () => refreshData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'module_settings'
      }, () => refreshData())
      .subscribe();

    return () => {
      window.removeEventListener('attendance-updated', handleAttendanceUpdate);
      window.removeEventListener('notices-updated', handleNoticeUpdate);
      window.removeEventListener('timetable-updated', handleTimetableUpdate);
      window.removeEventListener('student-data-updated', handleStudentDataUpdate);
      window.removeEventListener('module-settings-updated', handleModuleSettingsUpdate);
      supabase.removeChannel(channel);
    };
  }, [resolvedId, loadOnce, refreshData]);

  const handleDownloadIDCard = async () => {
    if (!student || !branding) {
      toast.error('Data not found. Please try again.');
      return;
    }
    setIsDownloadingId(true);
    try {
      await generateStudentIDCard(student, branding);
      toast.success('ID Card downloaded successfully');
    } catch (error) {
      console.error('ID Card download failed:', error);
      toast.error('Failed to generate ID card');
    } finally {
      setIsDownloadingId(false);
    }
  };

  const attendancePercentage = useMemo(() => {
    if (attendance.length === 0) return 0;
    const presentDays = attendance.filter(a => a.status === 'Present').length;
    return Math.round((presentDays / attendance.length) * 100);
  }, [attendance]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 pb-24 text-center min-h-[60vh] animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <RefreshCw className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="font-heading text-xl font-bold text-foreground mb-2">Couldn’t load your dashboard</h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-2">{error}</p>
        {profile?.username && (
          <p className="text-xs text-muted-foreground/70 mb-5">Login ID: {profile.username}</p>
        )}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={refreshData} variant="default" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Try again
          </Button>
          <Button onClick={() => signOut?.()} variant="outline" className="gap-2">
            <User className="w-4 h-4" /> Log out
          </Button>
        </div>
      </div>
    );
  }

  if (loading || !student) {
    return (
      <div className="flex flex-col items-center px-4 pt-8 pb-24 animate-fade-in min-h-[60vh]">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="relative mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-2xl ring-2 ring-primary/20 ring-offset-2 ring-offset-background animate-pulse" />
          </div>
          <h2 className="font-heading text-xl font-bold text-foreground mb-1">Loading your dashboard</h2>
          <p className="text-sm text-muted-foreground">Please wait a moment…</p>
        </div>

        <div className="w-full max-w-none md:max-w-4xl space-y-5">
          <Skeleton className="h-40 w-full rounded-[2rem]" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full rounded-[2rem]" />
            <Skeleton className="h-24 w-full rounded-[2rem]" />
          </div>
          <Skeleton className="h-32 w-full rounded-[2rem]" />
          <Skeleton className="h-48 w-full rounded-[2rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 pb-24 px-4 pt-4 max-w-none md:max-w-5xl mx-auto scroll-smooth">
      <div className="flex items-center justify-between px-2 shrink-0">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">My Portal</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={refreshData} 
          className="rounded-full text-muted-foreground hover:text-primary"
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* 1-7: Profile Header & Basic Info */}
      <Card className="card-native border-none shadow-lg bg-primary text-primary-foreground overflow-hidden relative rounded-[2.5rem] shrink-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
        <CardContent className="p-6 md:p-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative shrink-0">
              <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-primary-foreground/20 shadow-xl">
                <AvatarImage src={student.profile_picture_url || ''} alt={student.name} />
                <AvatarFallback className="text-2xl font-bold bg-primary-foreground/20 text-primary-foreground">
                  {student.name[0]}
                </AvatarFallback>
              </Avatar>
              {student.is_blue_tag && (
                <div className="absolute -bottom-1 -right-1 bg-background text-primary rounded-full p-1 shadow-lg border-2 border-primary animate-in fade-in zoom-in duration-500">
                  <CheckCircle2 className="w-4 h-4 fill-primary text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 text-center md:text-left space-y-2">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h1 className="font-heading text-2xl font-bold tracking-tight">
                    {student.prefix && <span>{student.prefix} </span>}
                    {student.name}
                  </h1>
                  {student.is_blue_tag && (
                    <Badge className="bg-background text-primary border-none rounded-full px-2 py-0 h-5 flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter shadow-sm animate-pulse">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-sm opacity-90 font-medium">Class {student.class} - Section {student.section}</p>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-none text-[10px] h-5">{student.student_type}</Badge>
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-none text-[10px] h-5">{student.gender}</Badge>
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-none text-[10px] h-5">{student.session_info}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/5 rounded-full translate-x-1/2 -translate-y-1/2" />
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4 shrink-0">
        <div className="bg-success/10 border border-success/20 rounded-[2rem] p-5 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all">
          <div className="w-10 h-10 rounded-2xl bg-success/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <p className="text-[10px] font-bold uppercase text-success tracking-widest">Attendance</p>
          <p className="font-bold text-xl leading-none text-success">{attendancePercentage}%</p>
        </div>
        <div className="bg-accent/10 border border-accent/20 rounded-[2rem] p-5 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all">
          <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-accent-foreground" />
          </div>
          <p className="text-[10px] font-bold uppercase text-accent-foreground tracking-widest">Class Rank</p>
          <p className="font-bold text-xl leading-none text-accent-foreground">#{student.rank}</p>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="space-y-6">
        {/* 6-7: Personal & Contact Details */}
        <Card className="card-native border-none shadow-md rounded-[2rem] bg-background">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Birth Date</p>
                <p className="text-sm font-bold text-foreground">{new Date(student.dob).toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Roll Number</p>
                <p className="text-sm font-bold text-primary font-mono">{student.roll_number || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Login ID</p>
                <p className="text-sm font-bold text-primary font-mono">{student.login_id}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Verification ID</p>
                <p className="text-sm font-bold text-primary font-mono">{student.verification_id}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Contact Info</p>
                <div className="flex items-center gap-2 text-sm font-bold text-foreground bg-muted/30 p-3 rounded-xl mt-1">
                  <Phone className="w-4 h-4 text-primary" />
                  {student.contact}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Family Information */}
        {student.linked_parents && student.linked_parents.length > 0 && (
          <Card className="card-native border-none shadow-md rounded-[2rem] bg-background">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4" /> Family Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-3">
              {student.linked_parents.map((parent) => (
                <div key={parent.id} className="p-4 rounded-2xl bg-muted/30 border border-muted/50 flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-sm font-bold text-foreground">{parent.full_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">{parent.parent_id}</p>
                      <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-primary/20 bg-primary/5 text-primary rounded-md uppercase font-black tracking-[0.05em] scale-90 origin-left">
                        {(parent as any).relationship || 'Guardian'}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-8 px-3 rounded-lg bg-white/50 border border-muted text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                    <Phone className="h-3 w-3 text-primary" />
                    {parent.phone}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Student Verification QR Code Section */}

        <Card className="card-native border-none shadow-md rounded-[2rem] bg-background overflow-hidden relative group">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <QrCode className="w-4 h-4" /> Student Verification Code
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2 flex flex-col items-center space-y-4 text-center">
            <div className="p-4 bg-white rounded-[2rem] shadow-inner border-4 border-muted/30">
              <QRCodeDataUrl 
                text={`${window.location.origin}/verify?id=${student.verification_id}`} 
                width={200}
                color="#000000"
                backgroundColor="#ffffff"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-foreground">Official Verification QR</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest italic">
                Scan to verify student status securely
              </p>
            </div>
          </CardContent>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-muted/20 rounded-full" />
        </Card>

        {/* Certificate Section */}
        {student.certificate_visible && settings.cert && certificate && (
          <Card className="card-native border-none shadow-md rounded-[2rem] bg-primary/5 border-primary/10 border overflow-hidden relative group">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <FileText className="w-4 h-4" /> Academic Certificate
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-4">
               <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-black text-foreground">Official Merit Certificate</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest italic">Issued on {new Date(certificate.generated_at).toLocaleDateString()}</p>
                  </div>
                  <Button 
                    className="rounded-2xl h-11 px-6 font-black shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    onClick={() => window.open(certificate.file_url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                  </Button>
               </div>
            </CardContent>
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary/5 rounded-full" />
          </Card>
        )}

        {/* ID Card Section */}
        {student.id_card_visible && settings.id && (
          <Card className="card-native border-none shadow-md rounded-[2rem] bg-primary/5 border-primary/10 border overflow-hidden relative group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Student ID Card
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-4">
               <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-black text-foreground">Official Digital ID Card</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest italic">Generate your official student identification</p>
                  </div>
                  <Button
                    className="rounded-2xl h-11 px-6 font-black shadow-lg shadow-primary/20 active:scale-95 transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={handleDownloadIDCard}
                    disabled={isDownloadingId}
                  >
                    {isDownloadingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Download ID
                  </Button>
               </div>
            </CardContent>
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary/5 rounded-full" />
          </Card>
        )}


        {/* Attendance Breakdown */}
        <Card className="card-native border-none shadow-md rounded-[2rem] bg-background">
          <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Attendance Record
            </CardTitle>
            <Badge className="bg-green-100 text-green-700 border-none">{attendancePercentage}% Present</Badge>
          </CardHeader>
          <CardContent className="p-6 pt-2 space-y-4">
            <Progress value={attendancePercentage} className="h-2 bg-muted rounded-full" />
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-green-50 border border-green-100 text-center">
                <p className="text-[10px] font-bold text-green-700 uppercase">Present</p>
                <p className="text-lg font-black text-green-800">{attendance.filter(a => a.status === 'Present').length}</p>
              </div>
              <div className="p-3 rounded-2xl bg-red-50 border border-red-100 text-center">
                <p className="text-[10px] font-bold text-red-700 uppercase">Absent</p>
                <p className="text-lg font-black text-red-800">{attendance.filter(a => a.status === 'Absent').length}</p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                <p className="text-[10px] font-bold text-amber-700 uppercase">Late</p>
                <p className="text-lg font-black text-amber-800">{attendance.filter(a => a.status === 'Late').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exam Dates */}
        <Card className="card-native border-none shadow-md rounded-[2rem] bg-background">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Megaphone className="w-4 h-4" /> Upcoming Exams
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            {exams.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">No upcoming exams.</div>
            ) : (
              <div className="space-y-3">
                {exams.map(exam => (
                  <div key={exam.id} className="flex items-center justify-between p-4 rounded-2xl border bg-background hover:border-primary/50 transition-colors">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">{exam.title}</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Examination</p>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-none font-mono">
                      {new Date(exam.date).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
