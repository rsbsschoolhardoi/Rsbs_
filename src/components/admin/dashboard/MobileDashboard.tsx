import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CreditCard, CheckCircle2, Megaphone, ShieldCheck, GraduationCap, Calendar, TrendingUp, Search, UserPlus, CalendarCheck, Plus } from 'lucide-react';
import { Student, Notice, Admission, Appointment } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function MobileDashboard() {
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
      .channel('admin_dashboard_mobile_realtime')
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
    { title: "Total Students", value: activeStudents.length, icon: Users },
    { title: "Fees Pending", value: pendingFeesCount, icon: CreditCard },
    { title: "Admissions", value: pendingAdmissions.length, icon: UserPlus },
    { title: "Appointments", value: pendingAppointments.length, icon: CalendarCheck },
  ];

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-8 max-w-7xl mx-auto h-full">
      {/* Admin Header */}
      <Card className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-primary to-accent" />
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="space-y-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Admin Control</h1>
              <p className="text-sm text-muted-foreground font-medium">Digital Ecosystem Monitor</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {stats.map((stat, i) => {
          const StatIcon = stat.icon;
          return (
            <Card key={i} className="rounded-2xl border border-border/60 bg-card shadow-card hover:shadow-hover transition-all active:scale-95 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-5">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{stat.title}</CardTitle>
                <div className="bg-muted text-accent p-2 rounded-lg group-hover:bg-accent/10 transition-colors">
                  <StatIcon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mobile quick action */}
      <div className="md:hidden space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground px-1">Quick broadcast</h2>
        <Button
          asChild
          className="w-full h-14 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground border-none shadow-card justify-between px-5"
        >
          <Link to="/admin/notices">
            <div className="flex items-center gap-3">
              <Megaphone className="w-5 h-5" />
              <span className="font-medium text-sm">Push Urgent Notice</span>
            </div>
            <Plus className="w-5 h-5" />
          </Link>
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 gap-6 min-h-0">
        <Card className="lg:col-span-4 rounded-2xl border border-border/60 bg-card shadow-card flex flex-col overflow-hidden">
          <CardHeader className="p-5 pb-3 shrink-0 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Users className="w-4 h-4 text-muted-foreground" /> Student Roster Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-3 flex-1 overflow-y-auto no-scrollbar min-h-[300px]">
            {activeStudents.length === 0 ? (
              <div className="h-full flex items-center justify-center border border-dashed border-border/60 rounded-2xl opacity-60 py-12">
                <p className="text-sm text-muted-foreground">No active students registered yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeStudents.slice(0, 10).map((student) => (
                  <div key={student.id} className="flex items-center gap-4 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors group">
                    <div className="bg-accent/10 text-accent font-semibold w-10 h-10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-accent-foreground transition-all text-lg">
                      {student.name ? student.name[0] : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{student.class} - {student.section}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs h-6 px-2.5 border-none font-medium ${
                      student.fee_status === 'Paid' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    }`}>
                      {student.fee_status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 rounded-2xl border border-border/60 bg-card shadow-card flex flex-col overflow-hidden">
          <CardHeader className="p-5 pb-3 shrink-0 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Megaphone className="w-4 h-4 text-muted-foreground" /> Communication Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-3 flex-1 overflow-y-auto no-scrollbar min-h-[300px]">
            {notices.length === 0 ? (
              <div className="h-full flex items-center justify-center border border-dashed border-border/60 rounded-2xl opacity-60 py-12">
                <p className="text-sm text-muted-foreground">No notices posted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notices.slice(0, 8).map((notice) => (
                  <div key={notice.id} className="border-l-2 border-border pl-4 py-3 hover:border-accent transition-all group hover:bg-muted/20 rounded-r-xl">
                    <p className="text-sm font-medium truncate group-hover:text-accent transition-colors text-foreground">{notice.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{notice.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
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

      {/* Admin Module Quick Access */}
      <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Fees", icon: CreditCard },
          { label: "Attendance", icon: TrendingUp },
          { label: "Exams", icon: Calendar },
          { label: "Faculty", icon: GraduationCap },
        ].map((mod, i) => {
          const ModIcon = mod.icon;
          return (
            <div key={i} className="p-4 rounded-xl border border-border/60 bg-muted/30 flex items-center gap-3">
              <ModIcon className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium text-muted-foreground">{mod.label} Module</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
