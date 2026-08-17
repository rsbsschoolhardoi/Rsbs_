import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Teacher, Student, AttendanceConfig } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  CheckCircle2, 
  GraduationCap, 
  Calendar, 
  LayoutDashboard,
  ClipboardList,
  Lock,
  Unlock,
  ChevronRight
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';

export default function TeacherAttendance() {
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

  useEffect(() => {
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
        console.error("Attendance fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const channel = supabase
      .channel('attendance_teacher_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'attendance',
        filter: `date=eq.${new Date().toISOString().split('T')[0]}`
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [teacherId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-[2rem]" />
        <Skeleton className="h-40 w-full rounded-[2rem]" />
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black uppercase tracking-widest text-primary">Attendance</h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Mark daily class records</p>
      </div>

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
                  Window {isWindowLocked ? "Closed" : "Open"}
                </p>
                <p className={cn(
                  "text-[10px] font-medium uppercase",
                  isWindowLocked ? "text-destructive/70" : "text-green-600/70 dark:text-green-400/70"
                )}>
                  {attendanceConfig.start_time.substring(0, 5)} - {attendanceConfig.end_time.substring(0, 5)}
                </p>
              </div>
            </div>
            {!isWindowLocked && (
              <Badge className="bg-green-600 text-white border-none">Active</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Classes List */}
      <div className="space-y-4">
        {teacher.class_assignments && teacher.class_assignments.length > 0 ? (
          <div className="space-y-4">
            {teacher.class_assignments.map((assignment) => {
              const key = `${assignment.class_id}_${assignment.section_id}`;
              const students = studentsByClass[key] || [];
              const summary = attendanceSummary[key];
              const isMarked = summary && summary.isMarked;
              const isLocked = isWindowLocked;

              return (
                <button
                  key={assignment.id}
                  onClick={() => navigate(`/teacher/mark-attendance/${assignment.class_id}/${assignment.section_id}`)}
                  className="w-full text-left group transition-all active:scale-[0.98]"
                >
                  <Card className={cn(
                    "border-none shadow-md rounded-[2rem] overflow-hidden transition-all",
                    isMarked ? "bg-green-50/50 dark:bg-green-950/10" : "bg-card"
                  )}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black text-primary uppercase tracking-tight">Class {assignment.class_name}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest px-2">Section {assignment.section_name}</Badge>
                            <Badge variant="outline" className="border-primary/20 text-muted-foreground text-[9px] font-black uppercase tracking-widest px-2">{students.length} Students</Badge>
                          </div>
                        </div>
                        <div className={cn(
                          "p-4 rounded-2xl shadow-sm border transition-all group-hover:bg-primary group-hover:text-white",
                          isLocked ? "bg-destructive/10 border-destructive/20 text-destructive" :
                          isMarked ? "bg-green-100 border-green-200 text-green-600" : 
                          "bg-primary/10 border-primary/20 text-primary"
                        )}>
                          {isLocked ? <Lock className="w-6 h-6" /> : isMarked ? <CheckCircle2 className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                        </div>
                      </div>
                      
                      {isMarked && summary && (
                        <div className="mt-4 pt-4 border-t border-primary/5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-[10px] text-green-600 uppercase font-black tracking-widest">Attendance Completed</p>
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {summary.present} / {summary.total} Present
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-2 rounded-[2rem]">
            <CardContent className="p-12 text-center">
              <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No assigned classes found</p>
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="p-4 bg-primary/5 rounded-[2rem] border border-primary/10 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">Important Instruction</p>
        <p className="text-[11px] font-bold text-muted-foreground leading-relaxed px-4">
          Please ensure all students are accounted for before submitting. Attendance once marked can be updated only within the active time window.
        </p>
      </div>
    </div>
  );
}
