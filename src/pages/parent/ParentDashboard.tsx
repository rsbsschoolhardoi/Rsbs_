import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParent } from '@/contexts/ParentContext';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Bell, 
  Clock, 
  ChevronRight, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  QrCode,
  Shield,
  User,
  ExternalLink
} from 'lucide-react';
import { StudentSwitcher } from '@/components/parent/StudentSwitcher';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

const ParentDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { students, selectedStudent, loading: parentLoading } = useParent();
  const [notices, setNotices] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchNotices = async () => {
    if (selectedStudent && profile?.id) {
      setLoadingDetails(true);
      try {
        const { data, error } = await api.getNoticesForParent(selectedStudent.student_id, profile.id);
        if (error) {
          console.error('Notice fetch error:', error);
        } else {
          setNotices(data || []);
        }
      } catch (err) {
        console.error('Error in notice fetch:', err);
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [selectedStudent, profile?.id]);

  if (parentLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing student data...</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <Card className="rounded-[2.5rem] border-dashed border-2 p-12 text-center bg-white shadow-none">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-10 w-10 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900">No Student Linked</h3>
            <p className="text-slate-500 font-medium">
              No student is currently linked to this account. Please contact the school administration to associate your children with your profile.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Student Switcher */}
      <StudentSwitcher />

      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-glow p-8 rounded-[2.5rem] text-white shadow-2xl shadow-primary/20">
        <div className="relative z-10 space-y-2">
          <h2 className="text-3xl font-black leading-tight">Welcome, {students[0]?.parent_full_name?.split(' ')[0] || 'Parent'}!</h2>
          <p className="text-white/80 font-medium max-w-lg">
            Manage {selectedStudent?.student_name}'s academic journey directly from your portal.
          </p>
        </div>
        <GraduationCap className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 rotate-12" />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/parent/attendance" className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col items-center text-center gap-3 transition-all hover:scale-[1.02] active:scale-95 group">
          <div className="p-3 bg-green-50 rounded-2xl group-hover:bg-green-100 transition-colors">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance</p>
            <p className="text-lg font-black text-slate-900">{selectedStudent?.yearly_attendance_percentage || '0'}%</p>
          </div>
        </Link>
        <Link to="/parent/fees" className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col items-center text-center gap-3 transition-all hover:scale-[1.02] active:scale-95 group">
          <div className="p-3 bg-amber-50 rounded-2xl group-hover:bg-amber-100 transition-colors">
            <CreditCard className="h-6 w-6 text-amber-500" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fee Status</p>
            <p className={`text-lg font-black ${selectedStudent?.fee_status === 'Paid' ? 'text-green-600' : 'text-amber-600'}`}>
              {selectedStudent?.fee_status || 'Pending'}
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Notices Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Recent Notices
          </h3>
          <Link to="/parent/more" className="text-[10px] font-black text-primary uppercase tracking-wider hover:underline">View All</Link>
        </div>
        
        <div className="space-y-3">
          {loadingDetails ? (
            <div className="p-12 text-center bg-white rounded-[2rem] border">
              <Loader2 className="h-6 w-6 animate-spin text-primary/30 mx-auto" />
            </div>
          ) : notices.length > 0 ? (
            notices.slice(0, 3).map((notice) => (
              <div key={notice.id} className="p-5 bg-white rounded-3xl border shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-primary uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded-md">{notice.category || 'General'}</span>
                      <span className="text-[10px] font-bold text-slate-400">{new Date(notice.date).toLocaleDateString()}</span>
                    </div>
                    <h5 className="font-black text-slate-900 leading-tight group-hover:text-primary transition-colors line-clamp-1">{notice.title}</h5>
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">{notice.content}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-1" />
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center bg-white rounded-[2rem] border border-dashed flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                <Bell className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No new notices</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Card */}
      <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <CardHeader className="bg-slate-900 p-6 flex flex-row items-center justify-between border-none">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-white font-black uppercase tracking-widest text-xs">Security & Support</h3>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <Link to="/parent/profile" className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <User className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 leading-none mb-1">Student Profile</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verification ID & Records</p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
            </Link>
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                Important: Please report any discrepancies in attendance or fee data to the school administration office immediately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentDashboard;
