import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CreditCard, CheckCircle2, Megaphone, ShieldCheck, GraduationCap, Calendar, TrendingUp, Search, UserPlus, CalendarCheck, Plus } from 'lucide-react';
import { Student, Notice, Admission, Appointment } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentRes, noticeRes, admissionRes, appointmentRes] = await Promise.all([
          api.getStudents(),
          api.getNotices(),
          api.getAdmissions(),
          api.getAppointments()
        ]);
        setStudents(studentRes.data || []);
        setNotices(noticeRes.data || []);
        setAdmissions(admissionRes.data || []);
        setAppointments(appointmentRes.data || []);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel('admin_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admissions' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const activeStudents = students.filter(s => s.status === 'active');
  const pendingFeesCount = activeStudents.filter(s => s.fee_status !== 'Paid').length;
  const pendingAdmissions = admissions.filter(a => a.status === 'pending');
  const pendingAppointments = appointments.filter(a => a.status === 'pending');

  const stats = [
    { title: "Total Students", value: activeStudents.length, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Fees Pending", value: pendingFeesCount, icon: CreditCard, color: "text-amber-600", bg: "bg-amber-100" },
    { title: "Admissions", value: pendingAdmissions.length, icon: UserPlus, color: "text-green-600", bg: "bg-green-100" },
    { title: "Appointments", value: pendingAppointments.length, icon: CalendarCheck, color: "text-purple-600", bg: "bg-purple-100" },
  ];

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 pt-4">
        <Skeleton className="h-40 w-full bg-muted rounded-[2.5rem]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full bg-muted rounded-[2rem]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 px-4 pt-4 overflow-y-auto no-scrollbar max-w-7xl mx-auto h-full">
      {/* Admin Header */}
      <Card className="border-none shadow-lg bg-primary text-white overflow-hidden relative rounded-[2.5rem] shrink-0">
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate uppercase tracking-widest">Admin Control</h1>
              <p className="text-sm opacity-80 font-medium">Digital Ecosystem Monitor</p>
            </div>
          </div>
        </CardContent>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2" />
      </Card>

      {/* Stats Grid - Prioritized for Emergency View on Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {stats.map((stat, i) => {
          const StatIcon = stat.icon;
          return (
            <Card key={i} className="border-none shadow-sm rounded-[2rem] bg-background border hover:shadow-md transition-all active:scale-95 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">{stat.title}</CardTitle>
                <div className={`${stat.bg} ${stat.color} p-2 rounded-xl group-hover:scale-110 transition-transform`}>
                  <StatIcon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <div className="text-xl md:text-2xl font-black text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Emergency Mode: Broadcast Quick Notice - Mobile Only */}
      <div className="md:hidden space-y-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2">Urgent Broadcast</h2>
        <Button 
          asChild
          className="w-full h-16 rounded-[2rem] bg-amber-100 hover:bg-amber-200 text-amber-900 border-none shadow-sm justify-between px-6"
        >
          <Link to="/admin/notices">
            <div className="flex items-center gap-3">
              <Megaphone className="w-5 h-5" />
              <span className="font-bold uppercase tracking-widest text-xs">Push Urgent Notice</span>
            </div>
            <Plus className="w-5 h-5" />
          </Link>
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 gap-6 min-h-0">
        <Card className="lg:col-span-4 border-none shadow-sm rounded-[2.5rem] bg-background border flex flex-col overflow-hidden">
          <CardHeader className="p-6 pb-2 shrink-0 border-b mx-4 mt-2">
            <CardTitle className="text-[10px] font-bold flex items-center gap-2 uppercase tracking-[0.2em] text-muted-foreground">
              <Users className="w-4 h-4" /> Student Roster Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-4 flex-1 overflow-y-auto no-scrollbar min-h-[300px]">
            {activeStudents.length === 0 ? (
              <div className="h-full flex items-center justify-center border-2 border-dashed rounded-[2rem] opacity-50 py-12">
                <p className="text-xs text-muted-foreground">No active students registered yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeStudents.slice(0, 10).map((student) => (
                  <div key={student.id} className="flex items-center gap-4 p-4 rounded-3xl bg-muted/20 hover:bg-muted/40 transition-colors group">
                    <div className="bg-primary/10 text-primary font-black w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all text-xl">
                      {student.name ? student.name[0] : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black truncate leading-none mb-1 text-foreground">{student.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate font-bold uppercase tracking-widest">{student.class} - {student.section}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] h-6 px-3 border-none font-bold uppercase ${
                      student.fee_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {student.fee_status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 border-none shadow-sm rounded-[2.5rem] bg-background border flex flex-col overflow-hidden">
          <CardHeader className="p-6 pb-2 shrink-0 border-b mx-4 mt-2">
            <CardTitle className="text-[10px] font-bold flex items-center gap-2 uppercase tracking-[0.2em] text-muted-foreground">
              <Megaphone className="w-4 h-4" /> Communication Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-4 flex-1 overflow-y-auto no-scrollbar min-h-[300px]">
            {notices.length === 0 ? (
              <div className="h-full flex items-center justify-center border-2 border-dashed rounded-[2rem] opacity-50 py-12">
                <p className="text-xs text-muted-foreground">No notices posted yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notices.slice(0, 8).map((notice) => (
                  <div key={notice.id} className="border-l-4 border-primary/30 pl-4 py-3 hover:border-primary transition-all group hover:bg-muted/10 rounded-r-2xl">
                    <p className="text-sm font-black truncate group-hover:text-primary transition-colors text-foreground">{notice.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed font-medium">{notice.content}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[8px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-widest">
                        {new Date(notice.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Module Quick Access - Hidden in Mobile Mode (Requirement 4) */}
      <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-4 pb-4">
        {[
          { label: "Fees", icon: CreditCard, color: "text-amber-600" },
          { label: "Attendance", icon: TrendingUp, color: "text-green-600" },
          { label: "Exams", icon: Calendar, color: "text-blue-600" },
          { label: "Faculty", icon: GraduationCap, color: "text-indigo-600" },
        ].map((mod, i) => {
          const ModIcon = mod.icon;
          return (
            <div key={i} className="p-4 bg-muted/30 rounded-3xl border border-dashed border-muted flex items-center gap-3">
              <ModIcon className={`w-4 h-4 ${mod.color}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{mod.label} Module</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
