import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParent } from '@/contexts/ParentContext';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, LogOut } from 'lucide-react';
import { StudentSwitcher } from '@/components/parent/StudentSwitcher';
import { motion } from 'motion/react';

const ParentAttendance: React.FC = () => {
  const { profile } = useAuth();
  const { selectedStudent, loading: parentLoading } = useParent();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [earlyLeaves, setEarlyLeaves] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchAttendance = async () => {
    if (selectedStudent && profile?.id) {
      setLoadingDetails(true);
      try {
        const [attendanceRes, earlyLeavesRes] = await Promise.all([
          api.getStudentAttendanceForParent(selectedStudent.student_id, profile.id),
          api.getEarlyLeavesHistory({
            studentId: selectedStudent.student_id,
            // Assuming we fetch last 30 days for parent too
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          })
        ]);

        if (attendanceRes.error) {
          console.error('Attendance fetch error:', attendanceRes.error);
          setAttendance([]);
        } else {
          setAttendance(attendanceRes.data || []);
        }

        setEarlyLeaves(earlyLeavesRes.data || []);
      } catch (err) {
        console.error('Error in attendance fetch:', err);
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedStudent, profile?.id]);

  if (parentLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing attendance records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <StudentSwitcher />

      <div className="space-y-2">
        <h2 className="text-3xl font-black text-slate-900 leading-tight">Attendance</h2>
        <p className="text-slate-500 font-medium">Tracking {selectedStudent?.student_name}'s school presence.</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Yearly Percentage</p>
            <p className="text-2xl font-black text-slate-900 leading-none">{selectedStudent?.yearly_attendance_percentage || '0'}%</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-slate-400" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</p>
            <p className="text-2xl font-black text-slate-900 leading-none">Healthy</p>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-4">Attendance History</h3>
        
        {loadingDetails ? (
          <div className="p-20 text-center bg-white rounded-[2rem] border shadow-sm flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Updating logs...</p>
          </div>
        ) : attendance.length > 0 ? (
          <div className="space-y-3 px-2">
            {attendance.map((record, i) => {
              const earlyLeave = earlyLeaves.find(el => el.date === record.date);
              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 bg-white rounded-3xl border shadow-sm flex flex-col gap-4 group hover:shadow-md transition-all border-l-4 border-l-transparent data-[status=Present]:border-l-green-500 data-[status=Absent]:border-l-red-500"
                  data-status={record.status}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        record.status === 'Present' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'
                      }`}>
                        {record.status === 'Present' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm leading-tight">
                          {new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                        {record.remarks && <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{record.remarks}</p>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {earlyLeave && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-tight h-6">
                          <LogOut className="h-3 w-3" />
                          Early Leave
                        </Badge>
                      )}
                      <Badge variant={record.status === 'Present' ? 'default' : 'destructive'} className="rounded-lg text-[10px] font-black px-3 h-6 uppercase tracking-wider shadow-sm">
                        {record.status}
                      </Badge>
                    </div>
                  </div>

                  {earlyLeave && (
                    <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-amber-800">
                        <Clock className="h-3 w-3" />
                        Exit Time: {new Date(`2000-01-01T${earlyLeave.exit_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 text-amber-600 mt-0.5" />
                        <p className="text-xs text-amber-800/80 italic font-medium">"{earlyLeave.reason}"</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="p-20 text-center bg-white rounded-[2rem] border border-dashed flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
              <Clock className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-slate-400 font-medium max-w-[200px] mx-auto leading-relaxed">No attendance records found for this student.</p>
          </div>
        )}
      </div>

      {/* Info Tip */}
      <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
          The school calculates the yearly percentage based on total school days in the current session.
        </p>
      </div>
    </div>
  );
};

export default ParentAttendance;
