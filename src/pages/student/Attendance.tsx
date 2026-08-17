import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { Attendance as AttendanceType, EarlyLeave } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, XCircle, Clock, LogOut, Info } from 'lucide-react';
import { MobilePageLoading } from '@/components/layouts/MobilePageLoading';
import { supabase } from '@/db/supabase';

export default function StudentAttendance() {
  const { profile } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceType[]>([]);
  const [earlyLeaves, setEarlyLeaves] = useState<EarlyLeave[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile?.student_id) return;
    setLoading(true);
    
    // Calculate start date (1 month ago)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const startDate = oneMonthAgo.toISOString().split('T')[0];
    
    const [attendanceRes, earlyLeavesRes] = await Promise.all([
      api.getAttendance(profile.student_id, startDate),
      api.getEarlyLeavesHistory({
        studentId: profile.student_id,
        startDate
      })
    ]);

    setAttendance(attendanceRes.data || []);
    setEarlyLeaves(earlyLeavesRes.data || []);
    setLoading(false);
  }, [profile?.student_id]);

  useEffect(() => {
    fetchData();

    const channel1 = supabase
      .channel('attendance_student_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'attendance',
        filter: `student_id=eq.${profile?.student_id}`
      }, () => {
        fetchData();
      })
      .subscribe();

    const channel2 = supabase
      .channel('early_leaves_student_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'early_leaves',
        filter: `student_id=eq.${profile?.student_id}`
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [profile?.student_id, fetchData]);

  const presentCount = attendance.filter(a => a.status === 'Present').length;
  const totalDays = attendance.length;
  const attendancePercentage = totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(1) : '0.0';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Present': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'Absent': return <XCircle className="w-5 h-5 text-destructive" />;
      case 'Late': return <Clock className="w-5 h-5 text-warning" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string }> = {
      Present: { bg: 'bg-success/10', text: 'text-success' },
      Absent: { bg: 'bg-destructive/10', text: 'text-destructive' },
      Late: { bg: 'bg-warning/10', text: 'text-warning' },
    };
    const variant = variants[status] || { bg: 'bg-muted', text: 'text-muted-foreground' };
    return (
      <Badge className={`${variant.bg} ${variant.text} border-0`}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <MobilePageLoading message="Loading attendance…" />;
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Calendar className="w-7 h-7 md:w-8 md:h-8 text-primary" />
          My Attendance
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">View your attendance record for the last 1 month.</p>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Attendance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs md:text-sm text-muted-foreground">Total Days</p>
              <p className="text-2xl md:text-3xl font-bold">{totalDays}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs md:text-sm text-muted-foreground">Present</p>
              <p className="text-2xl md:text-3xl font-bold text-success">{presentCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs md:text-sm text-muted-foreground">Absent</p>
              <p className="text-2xl md:text-3xl font-bold text-destructive">
                {attendance.filter(a => a.status === 'Absent').length}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs md:text-sm text-muted-foreground">Percentage</p>
              <p className="text-2xl md:text-3xl font-bold text-primary">{attendancePercentage}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Daily Records</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No attendance records yet.</p>
          ) : (
            <div className="space-y-3">
              {attendance.map((record) => {
                const earlyLeave = earlyLeaves.find(el => el.date === record.date);
                return (
                  <div
                    key={record.id}
                    className="flex flex-col p-3 md:p-4 rounded-lg border hover:bg-muted/50 transition-all gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <p className="font-medium text-sm md:text-base">
                            {new Date(record.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(record.status)}
                        {earlyLeave && (
                          <Badge className="bg-amber-100 text-amber-700 border-0 flex items-center gap-1">
                            <LogOut className="w-3 h-3" />
                            Early Leave
                          </Badge>
                        )}
                      </div>
                    </div>
                    {earlyLeave && (
                      <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 border border-amber-100 dark:border-amber-900/20 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                          <Clock className="w-3 h-3" />
                          Exit Time: {new Date(`2000-01-01T${earlyLeave.exit_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </div>
                        <div className="flex items-start gap-2">
                          <Info className="w-3 h-3 text-amber-600 mt-0.5" />
                          <p className="text-xs text-amber-800/80 dark:text-amber-400/80 italic font-medium">"{earlyLeave.reason}"</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
