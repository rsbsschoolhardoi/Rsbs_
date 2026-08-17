import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/db/api';
import { Student, Class, Section, Attendance, AttendanceConfig, EarlyLeave } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  Calendar as CalendarIcon,
  Search,
  Check,
  Lock,
  Unlock,
  AlertCircle,
  LogOut,
  Save,
  Trash2,
  Edit2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { getLocalDateString } from '@/lib/utils';

export default function MarkAttendance() {
  const { classId, sectionId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [dailyAttendance, setDailyAttendance] = useState<Record<string, string>>({});
  const [classInfo, setClassInfo] = useState<{name: string, section: string} | null>(null);
  const [attendanceConfig, setAttendanceConfig] = useState<AttendanceConfig | null>(null);
  const [overallLocked, setOverallLocked] = useState(false);

  // Early Leave states
  const [earlyLeaves, setEarlyLeaves] = useState<Record<string, EarlyLeave & { students: { name: string, class: string, section: string } }>>({});
  const [isEarlyLeaveModalOpen, setIsEarlyLeaveModalOpen] = useState(false);
  const [selectedStudentForEarlyLeave, setSelectedStudentForEarlyLeave] = useState<Student | null>(null);
  const [earlyLeaveExitTime, setEarlyLeaveExitTime] = useState('');
  const [earlyLeaveReason, setEarlyLeaveReason] = useState('');
  const [isEarlyLeaveLocked, setIsEarlyLeaveLocked] = useState(false);
  const [isEarlyLeaveConfirmOpen, setIsEarlyLeaveConfirmOpen] = useState(false);
  const [isEditingEarlyLeave, setIsEditingEarlyLeave] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  const checkLockStatus = useCallback((config: AttendanceConfig | null) => {
    if (isAdmin) {
      setOverallLocked(false);
      setIsEarlyLeaveLocked(false);
      return;
    }

    if (!config) {
      setOverallLocked(false);
      setIsEarlyLeaveLocked(false);
      return;
    }

    const now = new Date();
    const currentTimeInSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    // Attendance lock
    if (config.is_restriction_enabled) {
      const startTimeParts = config.start_time.split(':').map(Number);
      const startTimeInSeconds = startTimeParts[0] * 3600 + startTimeParts[1] * 60 + (startTimeParts[2] || 0);

      const endTimeParts = config.end_time.split(':').map(Number);
      const endTimeInSeconds = endTimeParts[0] * 3600 + endTimeParts[1] * 60 + (endTimeParts[2] || 0);

      const isWithinWindow = currentTimeInSeconds >= startTimeInSeconds && currentTimeInSeconds <= endTimeInSeconds;
      setOverallLocked(!isWithinWindow);
    } else {
      setOverallLocked(false);
    }

    // Early Leave lock
    if (config.is_early_leave_restriction_enabled && config.early_leave_start_time && config.early_leave_end_time) {
      const elStartTimeParts = config.early_leave_start_time.split(':').map(Number);
      const elStartTimeInSeconds = elStartTimeParts[0] * 3600 + elStartTimeParts[1] * 60 + (elStartTimeParts[2] || 0);

      const elEndTimeParts = config.early_leave_end_time.split(':').map(Number);
      const elEndTimeInSeconds = elEndTimeParts[0] * 3600 + elEndTimeParts[1] * 60 + (elEndTimeParts[2] || 0);

      const isWithinELWindow = currentTimeInSeconds >= elStartTimeInSeconds && currentTimeInSeconds <= elEndTimeInSeconds;
      setIsEarlyLeaveLocked(!isWithinELWindow);
    } else {
      setIsEarlyLeaveLocked(false);
    }
  }, [isAdmin]);

  const fetchData = useCallback(async () => {
    if (!classId || !sectionId || !profile?.teacher_id) return;
    setLoading(true);
    try {
      const [studentRes, classRes, attendanceRes, assignmentsRes, configRes, earlyLeaveRes] = await Promise.all([
        api.getStudents(),
        api.getClasses(),
        api.getAttendanceByClassAndDate(classId, sectionId, selectedDate),
        api.getTeacherAssignments(profile.teacher_id),
        api.getAttendanceConfig(),
        api.getEarlyLeavesByDate(selectedDate)
      ]);
      
      const config = configRes.data;
      setAttendanceConfig(config);
      checkLockStatus(config);
      
      // Verify teacher assignment for this class/section
      if (!isAdmin) {
        const isAssigned = assignmentsRes.data?.some(a => 
          a.class_id === classId && a.section_id === sectionId
        );
        if (!isAssigned) {
          toast.error('You are not assigned to this class for attendance marking');
          navigate('/teacher');
          return;
        }
      }

      const classData = classRes.data?.find((c: Class) => c.id === classId);
      const sectionData = classData?.sections.find((s: Section) => s.id === sectionId);
      
      if (classData && sectionData) {
        setClassInfo({ name: classData.name, section: sectionData.name });
      }

      const classStudents = (studentRes.data || []).filter((s: Student) => s.class_id === classId && s.section_id === sectionId);
      setStudents(classStudents);
      
      const statusMap: Record<string, string> = {};
      (attendanceRes.data || []).forEach(record => {
        statusMap[record.student_id] = record.status;
      });

      setDailyAttendance(statusMap);

      const elMap: Record<string, any> = {};
      (earlyLeaveRes.data || []).forEach(record => {
        elMap[record.student_id] = record;
      });
      setEarlyLeaves(elMap);
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [classId, sectionId, selectedDate, checkLockStatus, profile?.teacher_id, isAdmin, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update lock status every minute
  useEffect(() => {
    const timer = setInterval(() => {
      checkLockStatus(attendanceConfig);
    }, 60000);
    return () => clearInterval(timer);
  }, [attendanceConfig, checkLockStatus]);

  const markStatus = (studentId: string, status: string) => {
    if (overallLocked && !isAdmin) {
      toast.error('Attendance time window is closed');
      return;
    }
    setDailyAttendance(prev => ({ ...prev, [studentId]: status }));
  };


  const openEarlyLeaveModal = (student: Student) => {
    if (isEarlyLeaveLocked && !isAdmin) {
      toast.error('Early leave marking window is closed');
      return;
    }
    const existing = earlyLeaves[student.id];
    setSelectedStudentForEarlyLeave(student);
    setEarlyLeaveExitTime(existing ? existing.exit_time.substring(0, 5) : new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    setEarlyLeaveReason(existing ? existing.reason : '');
    setIsEditingEarlyLeave(existing ? existing.id : null);
    setIsEarlyLeaveModalOpen(true);
  };

  const handleMarkEarlyLeave = async () => {
    if (!selectedStudentForEarlyLeave || !earlyLeaveExitTime || !earlyLeaveReason) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsEarlyLeaveConfirmOpen(true);
  };

  const confirmEarlyLeave = async () => {
    if (!selectedStudentForEarlyLeave) return;

    const entry = {
      student_id: selectedStudentForEarlyLeave.id,
      date: selectedDate,
      exit_time: earlyLeaveExitTime + ':00',
      reason: earlyLeaveReason,
      created_by: profile?.id
    };

    const loadingToast = toast.loading('Saving early leave record...');
    try {
      if (isEditingEarlyLeave) {
        await api.updateEarlyLeave(isEditingEarlyLeave, entry as any);
      } else {
        await api.createEarlyLeave(entry as any);
      }
      toast.dismiss(loadingToast);
      toast.success('Early leave recorded successfully');
      setIsEarlyLeaveModalOpen(false);
      setIsEarlyLeaveConfirmOpen(false);
      fetchData();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || 'Failed to record early leave');
    }
  };

  const deleteEarlyLeave = async (id: string) => {
    if (!isAdmin) return;
    const loadingToast = toast.loading('Deleting early leave record...');
    try {
      await api.deleteEarlyLeave(id);
      toast.dismiss(loadingToast);
      toast.success('Record deleted');
      fetchData();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error('Failed to delete record');
    }
  };

  const markAllPresent = () => {
    if (overallLocked && !isAdmin) {
      toast.error('Attendance time window is closed');
      return;
    }
    const newAttendance: Record<string, string> = { ...dailyAttendance };
    students.forEach((s: Student) => {
      newAttendance[s.id] = 'Present';
    });
    setDailyAttendance(newAttendance);
    toast.success('All students marked as Present locally.');
  };

  const handleSave = async () => {
    if (overallLocked && !isAdmin) {
      toast.error('Attendance time window is closed');
      return;
    }

    const studentIds = Object.keys(dailyAttendance);
    if (studentIds.length === 0) {
      toast.error('No attendance data to save');
      return;
    }

    const entriesToSave = studentIds.map(studentId => ({
      student_id: studentId,
      date: selectedDate,
      status: dailyAttendance[studentId] as any,
      class_id: classId,
      section_id: sectionId,
      marked_by: profile?.id
    }));

    const loadingToast = toast.loading('Saving attendance...');
    try {
      await api.markBulkAttendance(entriesToSave as any);
      toast.dismiss(loadingToast);
      toast.success('Attendance synced successfully');
      if (!isAdmin) {
        navigate('/teacher');
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Failed to save attendance');
    }
  };

  const filteredStudents = students.filter((s: Student) => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.login_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-20 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 py-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teacher')} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-sm font-black uppercase tracking-widest text-primary">Attendance</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
              Class {classInfo?.name} - {classInfo?.section}
            </p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        {/* Status Alerts */}
        {isAdmin ? (
          <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-900/40 p-3 rounded-2xl flex items-center gap-3">
            <Unlock className="w-5 h-5 text-amber-600" />
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-tight">Admin Override</p>
              <p className="text-[9px] text-amber-700 font-medium">Full access enabled. Restriction window ignored.</p>
            </div>
          </div>
        ) : attendanceConfig?.is_restriction_enabled ? (
          overallLocked ? (
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-3xl flex items-center gap-4">
              <div className="bg-destructive/10 p-2 rounded-xl">
                <Lock className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-destructive uppercase tracking-tight">Attendance time window closed</p>
                <p className="text-[10px] text-destructive/70 font-medium uppercase">Window: {formatTime(attendanceConfig.start_time)} - {formatTime(attendanceConfig.end_time)}</p>
              </div>
            </div>
          ) : (
            <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-900/40 p-4 rounded-3xl flex items-center gap-4">
              <div className="bg-green-100 p-2 rounded-xl">
                <Unlock className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-green-700 dark:text-green-400 uppercase tracking-tight">Attendance window open</p>
                <p className="text-[10px] text-green-600/70 dark:text-green-400/70 font-medium uppercase">Window closes at {formatTime(attendanceConfig.end_time)}</p>
              </div>
            </div>
          )
        ) : (
          <div className="bg-muted/50 border border-muted p-3 rounded-2xl flex items-center gap-3">
            <Unlock className="w-5 h-5 text-muted-foreground" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Restriction Disabled: No time window enforced</p>
          </div>
        )}

        {/* Date & Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 h-12 rounded-2xl border-muted bg-muted/20"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search students..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-2xl border-muted bg-muted/20"
            />
          </div>
        </div>

        {/* Tabs for Attendance vs Early Leave */}
        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList className="w-full h-14 bg-muted/20 p-1.5 rounded-3xl border border-muted/50">
            <TabsTrigger value="attendance" className="flex-1 rounded-2xl font-black uppercase tracking-widest text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all">
              <Users className="w-4 h-4 mr-2" /> Attendance
            </TabsTrigger>
            <TabsTrigger value="early-leave" className="flex-1 rounded-2xl font-black uppercase tracking-widest text-[11px] data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
              <LogOut className="w-4 h-4 mr-2" /> Early Leave
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-6">
            {/* Quick Actions */}
            <div className="flex gap-2 shrink-0">
              <Button 
                variant="outline" 
                onClick={markAllPresent}
                disabled={overallLocked && !isAdmin}
                className="flex-1 h-12 rounded-2xl font-bold uppercase tracking-widest text-[10px] border-green-200 text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 disabled:opacity-50"
              >
                <Check className="w-3 h-3 mr-2" /> Mark All Present
              </Button>
            </div>

            {/* Students List */}
            <div className="space-y-3">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-3xl border border-dashed italic text-muted-foreground text-sm">
                  No students in this class.
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const status = dailyAttendance[student.id];
                  const isLocked = overallLocked && !isAdmin;

                  return (
                    <Card key={student.id} className={cn(
                      "border-none shadow-sm rounded-2xl transition-all relative overflow-hidden",
                      isLocked ? 'bg-muted/30 opacity-80' : 
                      status === 'Present' ? 'bg-green-50' : 
                      status === 'Absent' ? 'bg-red-50' : 
                      status === 'Late' ? 'bg-amber-50' : 'bg-card border border-muted'
                    )}>
                      <CardContent className="p-3 md:p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                           <Avatar className="h-10 w-10 border shadow-sm">
                            <AvatarImage src={student.profile_picture_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{student.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm truncate text-foreground">{student.name}</span>
                            {isLocked && (
                              <Badge variant="secondary" className="w-fit text-[8px] h-4 uppercase px-1.5 font-black text-muted-foreground">
                                <Lock className="w-2 h-2 mr-1" /> Locked
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button 
                            variant={status === 'Present' ? 'default' : 'ghost'} 
                            size="icon" 
                            disabled={isLocked}
                            className={cn(
                              "h-10 w-10 rounded-xl transition-all",
                              status === 'Present' ? 'bg-green-600 shadow-md shadow-green-200 text-white' : 'text-green-600 hover:bg-green-100'
                            )}
                            onClick={() => markStatus(student.id, 'Present')}
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </Button>
                          <Button 
                            variant={status === 'Absent' ? 'default' : 'ghost'} 
                            size="icon" 
                            disabled={isLocked}
                            className={cn(
                              "h-10 w-10 rounded-xl transition-all",
                              status === 'Absent' ? 'bg-red-600 shadow-md shadow-red-200 text-white' : 'text-red-600 hover:bg-red-100'
                            )}
                            onClick={() => markStatus(student.id, 'Absent')}
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                          <Button 
                            variant={status === 'Late' ? 'default' : 'ghost'} 
                            size="icon" 
                            disabled={isLocked}
                            className={cn(
                              "h-10 w-10 rounded-xl transition-all",
                              status === 'Late' ? 'bg-amber-600 shadow-md shadow-amber-200 text-white' : 'text-amber-600 hover:bg-amber-100'
                            )}
                            onClick={() => markStatus(student.id, 'Late')}
                          >
                            <Clock className="h-5 w-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="early-leave" className="space-y-6">
            {/* Lock Message */}
            {attendanceConfig?.is_early_leave_restriction_enabled && (
              isEarlyLeaveLocked ? (
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-3xl flex items-center gap-4">
                  <div className="bg-destructive/10 p-2 rounded-xl">
                    <Lock className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-destructive uppercase tracking-tight">Early Leave marking is locked</p>
                    <p className="text-[10px] text-destructive/70 font-medium uppercase leading-relaxed">Early Leave marking was allowed from {formatTime(attendanceConfig.early_leave_start_time || '12:00:00')} to {formatTime(attendanceConfig.early_leave_end_time || '16:00:00')}. This section is now locked.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-900/40 p-4 rounded-3xl flex items-center gap-4">
                  <div className="bg-amber-100 p-2 rounded-xl">
                    <Unlock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-tight">Early Leave window open</p>
                    <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 font-medium uppercase tracking-widest">Mark students who are leaving early</p>
                  </div>
                </div>
              )
            )}

            {/* Students List for Early Leave */}
            <div className="space-y-3">
              {students.filter(s => dailyAttendance[s.id] === 'Present').length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-3xl border border-dashed italic text-muted-foreground text-sm px-6 leading-relaxed">
                  Only students marked as <span className="font-black text-primary uppercase tracking-tight">Present</span> are eligible for Early Leave.
                </div>
              ) : (
                students.filter(s => dailyAttendance[s.id] === 'Present').map((student) => {
                  const existing = earlyLeaves[student.id];
                  const isLocked = isEarlyLeaveLocked && !isAdmin;

                  return (
                    <Card key={student.id} className={cn(
                      "border-none shadow-sm rounded-2xl transition-all relative overflow-hidden",
                      existing ? 'bg-amber-50 border border-amber-200' : 'bg-card border border-muted'
                    )}>
                      <CardContent className="p-3 md:p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                           <Avatar className="h-10 w-10 border shadow-sm">
                            <AvatarImage src={student.profile_picture_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{student.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm truncate text-foreground">{student.name}</span>
                            {existing && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tight border-amber-200 text-amber-700 bg-amber-100 py-0">
                                  {formatTime(existing.exit_time.substring(0, 5))}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground truncate italic">"{existing.reason}"</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {existing ? (
                            isAdmin ? (
                              <div className="flex gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  onClick={() => openEarlyLeaveModal(student)}
                                  className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  onClick={() => deleteEarlyLeave(existing.id)}
                                  className="h-10 w-10 rounded-xl bg-red-100 text-red-700 hover:bg-red-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-800 border-amber-200">Recorded</Badge>
                            )
                          ) : (
                            <Button 
                              variant="outline"
                              size="sm"
                              disabled={isLocked}
                              onClick={() => openEarlyLeaveModal(student)}
                              className="h-10 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
                            >
                              Mark Early Leave
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Early Leave Modal */}
      <Dialog open={isEarlyLeaveModalOpen} onOpenChange={setIsEarlyLeaveModalOpen}>
        <DialogContent className="max-w-md rounded-[2rem] border-none p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="bg-amber-500 p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <LogOut className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Record Early Leave</DialogTitle>
                <DialogDescription className="text-white/80 font-medium uppercase tracking-widest text-xs mt-1">Student: {selectedStudentForEarlyLeave?.name}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Exit Time</Label>
              <div className="relative group">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
                <Input 
                  type="time" 
                  value={earlyLeaveExitTime}
                  onChange={(e) => setEarlyLeaveExitTime(e.target.value)}
                  className="pl-11 h-14 rounded-2xl border-muted bg-muted/10 focus-visible:ring-amber-500 focus-visible:border-amber-500 transition-all font-mono text-lg"
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Reason for leaving</Label>
              <Textarea 
                placeholder="e.g., Medical appointment, Family emergency..."
                value={earlyLeaveReason}
                onChange={(e) => setEarlyLeaveReason(e.target.value)}
                className="min-h-[120px] rounded-2xl border-muted bg-muted/10 focus-visible:ring-amber-500 focus-visible:border-amber-500 transition-all resize-none p-4"
              />
            </div>
          </div>
          <DialogFooter className="p-8 pt-0 flex gap-3">
            <Button variant="outline" onClick={() => setIsEarlyLeaveModalOpen(false)} className="flex-1 h-12 rounded-2xl font-bold uppercase tracking-widest text-xs border-muted text-muted-foreground">Cancel</Button>
            <Button onClick={handleMarkEarlyLeave} className="flex-1 h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-amber-500/20">Submit Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={isEarlyLeaveConfirmOpen} onOpenChange={setIsEarlyLeaveConfirmOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-none p-8 max-w-sm">
          <AlertDialogHeader className="space-y-4">
            <div className="w-16 h-16 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <div className="text-center space-y-2">
              <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground">Confirm Entry</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
                Are you sure you want to mark <span className="text-foreground font-bold">{selectedStudentForEarlyLeave?.name}</span> as Early Leave? This action cannot be undone by teachers.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex gap-3 sm:flex-row">
            <AlertDialogCancel className="flex-1 h-12 rounded-2xl border-muted font-bold uppercase tracking-widest text-[10px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEarlyLeave} className="flex-1 h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 font-black uppercase tracking-widest text-[10px]">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-40">
        <Button 
          onClick={handleSave}
          disabled={(overallLocked && !isAdmin) || Object.keys(dailyAttendance).length === 0}
          className="w-full max-w-lg h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          {overallLocked && !isAdmin ? (
            <>
              <Lock className="w-6 h-6" />
              Window Closed
            </>
          ) : (
            <>
              <CheckCircle2 className="w-6 h-6" />
              Save Attendance
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
