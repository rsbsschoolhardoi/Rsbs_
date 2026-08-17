import { useEffect, useState, useCallback } from 'react';
import { api } from '@/db/api';
import { Student, Class, EarlyLeave } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, CheckCheck, Loader2, LogOut, Edit2, Trash2, AlertCircle, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

import { getLocalDateString } from '@/lib/utils';

export default function AttendanceNew() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'Present' | 'Absent' | 'Late'>>({});

  // Early Leave states
  const [earlyLeaves, setEarlyLeaves] = useState<Record<string, EarlyLeave>>({});
  const [isEarlyLeaveModalOpen, setIsEarlyLeaveModalOpen] = useState(false);
  const [selectedStudentForEarlyLeave, setSelectedStudentForEarlyLeave] = useState<Student | null>(null);
  const [earlyLeaveExitTime, setEarlyLeaveExitTime] = useState('');
  const [earlyLeaveReason, setEarlyLeaveReason] = useState('');
  const [isEarlyLeaveConfirmOpen, setIsEarlyLeaveConfirmOpen] = useState(false);
  const [isEditingEarlyLeave, setIsEditingEarlyLeave] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data } = await api.getClasses();
      setClasses(data || []);
    };
    fetchClasses();
  }, []);

  const fetchStudentsAndAttendance = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId) return;
    setLoading(true);
    try {
      const [studentsRes, attendanceRes, earlyLeavesRes] = await Promise.all([
        api.getStudents(),
        api.getAttendanceByClassAndDate(selectedClassId, selectedSectionId, selectedDate),
        api.getEarlyLeavesByDate(selectedDate)
      ]);

      const filtered = (studentsRes.data || []).filter(
        s => s.class_id === selectedClassId && s.section_id === selectedSectionId
      );
      setStudents(filtered);

      const map: Record<string, 'Present' | 'Absent' | 'Late'> = {};
      (attendanceRes.data || []).forEach((a: any) => {
        map[a.student_id] = a.status;
      });
      setAttendanceMap(map);

      const elMap: Record<string, EarlyLeave> = {};
      (earlyLeavesRes.data || []).forEach((el: any) => {
        elMap[el.student_id] = el;
      });
      setEarlyLeaves(elMap);
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedSectionId, selectedDate]);

  useEffect(() => {
    fetchStudentsAndAttendance();

    const channel1 = supabase
      .channel('attendance_admin')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'attendance',
        filter: `date=eq.${selectedDate}`
      }, () => {
        fetchStudentsAndAttendance();
      })
      .subscribe();

    const channel2 = supabase
      .channel('early_leaves_admin')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'early_leaves',
        filter: `date=eq.${selectedDate}`
      }, () => {
        fetchStudentsAndAttendance();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [selectedClassId, selectedSectionId, selectedDate, fetchStudentsAndAttendance]);

  const openEarlyLeaveModal = (student: Student) => {
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
      fetchStudentsAndAttendance();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || 'Failed to record early leave');
    }
  };

  const deleteEarlyLeave = async (id: string) => {
    const loadingToast = toast.loading('Deleting early leave record...');
    try {
      await api.deleteEarlyLeave(id);
      toast.dismiss(loadingToast);
      toast.success('Record deleted');
      fetchStudentsAndAttendance();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error('Failed to delete record');
    }
  };

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };


  const markStatus = (studentId: string, status: 'Present' | 'Absent' | 'Late') => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const markAllPresent = () => {
    const map: Record<string, 'Present' | 'Absent' | 'Late'> = {};
    students.forEach(s => {
      map[s.id] = 'Present';
    });
    setAttendanceMap(map);
    toast.success('All students marked present');
  };

  const saveAttendance = async () => {
    if (!selectedClassId || !selectedSectionId) {
      toast.error('Please select class and section');
      return;
    }

    setSaving(true);
    try {
      const entries = Object.entries(attendanceMap).map(([student_id, status]) => ({
        student_id,
        date: selectedDate,
        status,
        class_id: selectedClassId,
        section_id: selectedSectionId,
        marked_by: profile?.id || null,
      }));

      await api.markBulkAttendance(entries as any);
      toast.success('Attendance saved successfully');
    } catch (error: any) {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.login_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const presentCount = Object.values(attendanceMap).filter(s => s === 'Present').length;
  const absentCount = Object.values(attendanceMap).filter(s => s === 'Absent').length;
  const lateCount = Object.values(attendanceMap).filter(s => s === 'Late').length;

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Class Attendance</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Mark attendance for selected class and section.</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-xl">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-fit border-none bg-transparent h-8 px-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <Select onValueChange={(val) => { setSelectedClassId(val); setSelectedSectionId(''); }} value={selectedClassId}>
          <SelectTrigger className="rounded-xl h-11">
            <SelectValue placeholder="Select Class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          onValueChange={setSelectedSectionId}
          value={selectedSectionId}
          disabled={!selectedClassId}
        >
          <SelectTrigger className="rounded-xl h-11">
            <SelectValue placeholder="Select Section" />
          </SelectTrigger>
          <SelectContent>
            {selectedClass?.sections.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={markAllPresent}
          disabled={!selectedClassId || !selectedSectionId || students.length === 0}
          variant="outline"
          className="rounded-xl h-11 border-primary/20 hover:bg-primary/10"
        >
          <CheckCheck className="w-4 h-4 mr-2" />
          Mark All Present
        </Button>
      </div>

      {selectedClassId && selectedSectionId && (
        <>
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search students..."
              className="pl-10 h-10 rounded-xl border-muted bg-background/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <Tabs defaultValue="attendance" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full max-w-md h-12 bg-muted/20 p-1 rounded-2xl border border-muted/50 mb-4 shrink-0">
                <TabsTrigger value="attendance" className="flex-1 rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Users className="w-3.5 h-3.5 mr-2" /> Attendance
                </TabsTrigger>
                <TabsTrigger value="early-leave" className="flex-1 rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                  <LogOut className="w-3.5 h-3.5 mr-2" /> Early Leave
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-0">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed">
                    <p className="text-muted-foreground">No students found in this class.</p>
                  </div>
                ) : (
                  <>
                    <TabsContent value="attendance" className="m-0 space-y-3 focus-visible:ring-0">
                      <div className="space-y-2">
                        {filteredStudents.map((student) => {
                          const status = attendanceMap[student.id];
                          return (
                            <Card key={student.id} className="border-none shadow-sm rounded-2xl bg-card hover:shadow-md transition-shadow">
                              <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 border">
                                    <AvatarImage src={student.profile_picture_url || ''} />
                                    <AvatarFallback className="bg-primary/10 text-primary">{student.name[0]}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-bold text-foreground">{student.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{student.login_id}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant={status === 'Present' ? 'default' : 'outline'}
                                    size="sm"
                                    className={`rounded-xl h-9 px-4 ${status === 'Present' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                                    onClick={() => markStatus(student.id, 'Present')}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Present
                                  </Button>
                                  <Button
                                    variant={status === 'Absent' ? 'default' : 'outline'}
                                    size="sm"
                                    className={`rounded-xl h-9 px-4 ${status === 'Absent' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                                    onClick={() => markStatus(student.id, 'Absent')}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Absent
                                  </Button>
                                  <Button
                                    variant={status === 'Late' ? 'default' : 'outline'}
                                    size="sm"
                                    className={`rounded-xl h-9 px-4 ${status === 'Late' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                                    onClick={() => markStatus(student.id, 'Late')}
                                  >
                                    <Clock className="h-4 w-4 mr-1" />
                                    Late
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </TabsContent>

                    <TabsContent value="early-leave" className="m-0 space-y-3 focus-visible:ring-0">
                      {filteredStudents.filter(s => attendanceMap[s.id] === 'Present').length === 0 ? (
                        <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed px-6">
                          <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                            Only students marked as <span className="font-black text-primary uppercase tracking-tight">Present</span> are eligible for Early Leave.
                          </p>
                        </div>
                      ) : (
                        filteredStudents.filter(s => attendanceMap[s.id] === 'Present').map((student) => {
                          const existing = earlyLeaves[student.id];
                          return (
                            <Card key={student.id} className={cn(
                              "border-none shadow-sm rounded-2xl transition-all relative overflow-hidden",
                              existing ? 'bg-amber-50 border border-amber-200 shadow-md shadow-amber-500/5' : 'bg-card border border-muted hover:shadow-md transition-shadow'
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
                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tight border-amber-200 text-amber-700 bg-amber-100 py-0 h-4">
                                          {formatTime(existing.exit_time.substring(0, 5))}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground truncate italic font-medium max-w-[150px]">"{existing.reason}"</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {existing ? (
                                    <div className="flex gap-1">
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        onClick={() => openEarlyLeaveModal(student)}
                                        className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        onClick={() => deleteEarlyLeave(existing.id)}
                                        className="h-10 w-10 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button 
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openEarlyLeaveModal(student)}
                                      className="h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all active:scale-95"
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
                    </TabsContent>
                  </>
                )}
              </div>
            </Tabs>
          </div>

          <div className="shrink-0 bg-card border rounded-2xl p-4 space-y-4 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600" />
                  <span className="font-medium">Present: {presentCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600" />
                  <span className="font-medium">Absent: {absentCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-600" />
                  <span className="font-medium">Late: {lateCount}</span>
                </div>
              </div>
              <Button
                onClick={saveAttendance}
                disabled={saving || Object.keys(attendanceMap).length === 0}
                className="rounded-xl px-8 h-11 shadow-lg shadow-primary/20"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Attendance'
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {!selectedClassId && !selectedSectionId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <CalendarIcon className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Select Class & Section</h3>
              <p className="text-sm text-muted-foreground">Choose a class and section to start marking attendance</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Early Leave Modal */}
      <Dialog open={isEarlyLeaveModalOpen} onOpenChange={setIsEarlyLeaveModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <LogOut className="w-5 h-5 text-amber-500" />
              Early Leave
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              Record exit details for <span className="text-foreground font-bold">{selectedStudentForEarlyLeave?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="exit-time" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                Exit Time
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="exit-time"
                  type="time"
                  value={earlyLeaveExitTime}
                  onChange={(e) => setEarlyLeaveExitTime(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-muted bg-background focus-visible:ring-amber-500/20 focus-visible:border-amber-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                Reason for Leaving
              </Label>
              <Textarea
                id="reason"
                placeholder="Enter valid reason for early departure..."
                value={earlyLeaveReason}
                onChange={(e) => setEarlyLeaveReason(e.target.value)}
                className="min-h-[100px] rounded-xl border-muted bg-background focus-visible:ring-amber-500/20 focus-visible:border-amber-500 resize-none p-4"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsEarlyLeaveModalOpen(false)} className="rounded-xl h-12 font-bold uppercase tracking-widest text-xs flex-1">
              Cancel
            </Button>
            <Button onClick={handleMarkEarlyLeave} className="rounded-xl h-12 font-black uppercase tracking-widest text-xs flex-1 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20">
              {isEditingEarlyLeave ? 'Update Record' : 'Save Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={isEarlyLeaveConfirmOpen} onOpenChange={setIsEarlyLeaveConfirmOpen}>
        <AlertDialogContent className="rounded-3xl p-6">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Confirm Early Leave</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground leading-relaxed">
              Are you sure you want to mark <span className="text-foreground font-bold">{selectedStudentForEarlyLeave?.name}</span> as Early Leave for today? 
              This will be recorded formally in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel className="rounded-xl h-12 font-bold uppercase tracking-widest text-xs flex-1">Go Back</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmEarlyLeave}
              className="rounded-xl h-12 font-black uppercase tracking-widest text-xs flex-1 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 border-none"
            >
              Confirm & Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
