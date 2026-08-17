import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Teacher, Student, AttendanceConfig } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  CheckCircle2, 
  GraduationCap, 
  Calendar, 
  LayoutDashboard,
  ClipboardList,
  Lock,
  Unlock,
  User,
  Bell,
  MessageSquare
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ProfileTagBadge } from '@/components/ProfileTagBadge';
import { supabase } from '@/db/supabase';

export default function TeacherDashboardNew() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentsByClass, setStudentsByClass] = useState<Record<string, Student[]>>({});
  const [attendanceSummary, setAttendanceSummary] = useState<Record<string, { present: number, total: number, isMarked: boolean }>>({});
  const [attendanceConfig, setAttendanceConfig] = useState<AttendanceConfig | null>(null);
  const [isWindowLocked, setIsWindowLocked] = useState(false);

  const teacherId = profile?.teacher_id;

  const checkWindowLock = (config: AttendanceConfig | null) => {
    if (!config || !config.is_restriction_enabled) {
      setIsWindowLocked(false);
      return;
    }

    const now = new Date();
    const currentTimeInSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    
    const startTimeParts = config.start_time.split(':').map(Number);
    const startTimeInSeconds = startTimeParts[0] * 3600 + startTimeParts[1] * 60 + (startTimeParts[2] || 0);

    const endTimeParts = config.end_time.split(':').map(Number);
    const endTimeInSeconds = endTimeParts[0] * 3600 + endTimeParts[1] * 60 + (endTimeParts[2] || 0);

    const isWithinWindow = currentTimeInSeconds >= startTimeInSeconds && currentTimeInSeconds <= endTimeInSeconds;
    setIsWindowLocked(!isWithinWindow);
  };

  const fetchData = async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const [teacherRes, configRes] = await Promise.all([
        api.getTeachers(),
        api.getAttendanceConfig()
      ]);
      
      const currentTeacher = teacherRes.data?.find(t => t.id === teacherId);
      const config = configRes.data;
      
      setAttendanceConfig(config);
      checkWindowLock(config);
      
      if (currentTeacher) {
        setTeacher(currentTeacher);
        
        const { data: allStudents } = await api.getStudents();
        const filteredStudents: Record<string, Student[]> = {};
        const summary: Record<string, { present: number, total: number, isMarked: boolean }> = {};

        if (allStudents) {
          const today = new Date().toISOString().split('T')[0];

          for (const assignment of currentTeacher.class_assignments || []) {
            const key = `${assignment.class_id}_${assignment.section_id}`;
            const classStudents = allStudents.filter(s => s.class_id === assignment.class_id && s.section_id === assignment.section_id);
            filteredStudents[key] = classStudents;
            
            const { data: attendanceData } = await api.getAttendanceByClassAndDate(assignment.class_id, assignment.section_id, today);
            
            const presentCount = (attendanceData || []).filter(a => a.status === 'Present' || a.status === 'Late').length;
            const isMarked = (attendanceData || []).length > 0;

            summary[key] = { 
              present: presentCount, 
              total: classStudents.length,
              isMarked
            };
          }
        }
        setStudentsByClass(filteredStudents);
        setAttendanceSummary(summary);
      }
    } catch (err) {
      console.error("Teacher dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!teacherId) return;

    // Listen for real-time updates from AuthContext (Unified mechanism)
    const handleAttendanceUpdate = () => fetchData();
    const handleNoticeUpdate = () => fetchData();
    const handleTimetableUpdate = () => fetchData();
    const handleStudentDataUpdate = () => fetchData();

    window.addEventListener('attendance-updated', handleAttendanceUpdate);
    window.addEventListener('notices-updated', handleNoticeUpdate);
    window.addEventListener('timetable-updated', handleTimetableUpdate);
    window.addEventListener('student-data-updated', handleStudentDataUpdate);

    // Keep existing teacher-specific listeners if they handle something extra
    const channel = supabase
      .channel('teacher-dashboard-specific')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'teachers', 
        filter: `id=eq.${teacherId}` 
      }, () => fetchData())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'teacher_queries',
        filter: `teacher_id=eq.${teacherId}`
      }, () => fetchData())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'student_queries',
        filter: `target_teacher_id=eq.${teacherId}`
      }, () => fetchData())
      .subscribe();

    return () => {
      window.removeEventListener('attendance-updated', handleAttendanceUpdate);
      window.removeEventListener('notices-updated', handleNoticeUpdate);
      window.removeEventListener('timetable-updated', handleTimetableUpdate);
      window.removeEventListener('student-data-updated', handleStudentDataUpdate);
      supabase.removeChannel(channel);
    };

  }, [teacherId]);

  useEffect(() => {
    const timer = setInterval(() => {
      checkWindowLock(attendanceConfig);
    }, 60000);
    return () => clearInterval(timer);
  }, [attendanceConfig]);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black uppercase tracking-widest text-primary">Teacher Dashboard</h1>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Welcome back, {teacher.name.split(' ')[0]}</p>
      </div>

      {/* Profile Card */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden relative rounded-[2.5rem]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12" />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-4 border-white/20 shadow-xl">
              <AvatarImage src={teacher.profile_picture_url || ''} />
              <AvatarFallback className="bg-white/20 text-white font-black text-xl">{teacher.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-black">{teacher.name}</h2>
                <ProfileTagBadge tag={teacher.profile_tag} size="sm" />
              </div>
              <p className="text-xs text-white/80 uppercase tracking-wide">{teacher.subject_role}</p>
              <p className="text-[10px] text-white/60 font-mono mt-1">{teacher.login_id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Window Status */}
      {attendanceConfig?.is_restriction_enabled && (
        <Card className={cn(
          "border-none shadow-md rounded-[2rem] overflow-hidden",
          isWindowLocked ? "bg-destructive/10 border border-destructive/20" : "bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-900/40"
        )}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-xl",
                isWindowLocked ? "bg-destructive/10" : "bg-green-100"
              )}>
                {isWindowLocked ? <Lock className="w-5 h-5 text-destructive" /> : <Unlock className="w-5 h-5 text-green-600" />}
              </div>
              <div>
                <p className={cn(
                  "text-sm font-black uppercase tracking-tight",
                  isWindowLocked ? "text-destructive" : "text-green-700 dark:text-green-400"
                )}>
                  Attendance Window {isWindowLocked ? "Closed" : "Open"}
                </p>
                <p className={cn(
                  "text-[10px] font-medium uppercase",
                  isWindowLocked ? "text-destructive/70" : "text-green-600/70 dark:text-green-400/70"
                )}>
                  Time: {attendanceConfig.start_time.substring(0, 5)} - {attendanceConfig.end_time.substring(0, 5)}
                </p>
              </div>
            </div>
            {!isWindowLocked && (
              <Badge className="bg-green-600 text-white border-none animate-pulse">Live</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-4 gap-2">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/teacher/profile')}
          className="flex flex-col h-20 gap-2 rounded-2xl hover:bg-primary/5 group"
        >
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-100 transition-colors">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Profile</span>
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/teacher/attendance')}
          className="flex flex-col h-20 gap-2 rounded-2xl hover:bg-primary/5 group"
        >
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl group-hover:bg-green-100 transition-colors">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Records</span>
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/teacher/notices')}
          className="flex flex-col h-20 gap-2 rounded-2xl hover:bg-primary/5 group"
        >
          <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl group-hover:bg-purple-100 transition-colors">
            <Bell className="w-5 h-5 text-purple-600" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Notices</span>
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/teacher/queries')}
          className="flex flex-col h-20 gap-2 rounded-2xl hover:bg-primary/5 group"
        >
          <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl group-hover:bg-orange-100 transition-colors">
            <MessageSquare className="w-5 h-5 text-orange-600" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Help</span>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none shadow-md rounded-2xl bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-black text-blue-600">{teacher.class_assignments?.length || 0}</p>
            <p className="text-[10px] text-blue-600/70 uppercase font-bold tracking-wide">Classes</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md rounded-2xl bg-green-50 dark:bg-green-950/30">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-black text-green-600">
              {Object.values(attendanceSummary).filter(s => s.isMarked).length}
            </p>
            <p className="text-[10px] text-green-600/70 uppercase font-bold tracking-wide">Marked Today</p>
          </CardContent>
        </Card>
      </div>

      {/* My Classes */}
      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          My Classes
        </h3>
        {teacher.class_assignments && teacher.class_assignments.length > 0 ? (
          <div className="space-y-3">
            {teacher.class_assignments.map((assignment) => {
              const key = `${assignment.class_id}_${assignment.section_id}`;
              const students = studentsByClass[key] || [];
              const summary = attendanceSummary[key];
              const isMarked = summary && summary.isMarked;
              const isLocked = isWindowLocked;

              return (
                <Card key={assignment.id} className="border-none shadow-md rounded-[2rem] bg-card hover:shadow-lg transition-all active:scale-[0.98] group overflow-hidden">
                  <CardHeader className="bg-primary/5 p-4 border-b border-primary/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base font-black text-primary uppercase tracking-tight">Class {assignment.class_name}</CardTitle>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Section {assignment.section_name}</p>
                      </div>
                      <div className={cn(
                        "p-2 rounded-xl shadow-sm border",
                        isMarked ? "bg-green-50 border-green-200" : "bg-white dark:bg-gray-800 border-primary/10"
                      )}>
                        {isLocked ? (
                          <Lock className="w-5 h-5 text-destructive" />
                        ) : isMarked ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <ClipboardList className="w-5 h-5 text-primary/40" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Student Strength</p>
                        <p className="text-sm font-black">{students.length} Students</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Attendance Status</p>
                        <p className={cn(
                          "text-sm font-black",
                          isLocked ? "text-destructive" : isMarked ? "text-green-600" : "text-muted-foreground"
                        )}>
                          {isLocked ? "Window Closed" : isMarked ? "Marked" : "Not Marked"}
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => navigate(`/teacher/mark-attendance/${assignment.class_id}/${assignment.section_id}`)}
                      variant={isLocked ? "outline" : "secondary"}
                      className={cn(
                        "w-full rounded-2xl h-11 border-none shadow-none font-bold uppercase tracking-widest text-xs transition-all"
                      )}
                    >
                      {isLocked ? "View Attendance" : isMarked ? "Update Attendance" : "Mark Attendance"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-2 rounded-2xl">
            <CardContent className="p-8 text-center">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No classes assigned yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
