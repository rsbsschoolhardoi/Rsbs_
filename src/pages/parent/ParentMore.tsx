import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParent } from '@/contexts/ParentContext';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Clock, 
  HelpCircle, 
  LogOut, 
  ChevronRight, 
  Loader2, 
  Settings, 
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  User
} from 'lucide-react';
import { StudentSwitcher } from '@/components/parent/StudentSwitcher';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ParentMore: React.FC = () => {
  const { signOut, profile } = useAuth();
  const { selectedStudent, loading: parentLoading } = useParent();
  const [notices, setNotices] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [view, setView] = useState<'menu' | 'notices' | 'timetable'>('menu');
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const fetchData = async () => {
    if (selectedStudent && profile?.id) {
      setLoadingDetails(true);
      try {
        const [noticeRes, timetableRes] = await Promise.all([
          api.getNoticesForParent(selectedStudent.student_id, profile.id),
          api.getTimetableForParent(selectedStudent.student_id, profile.id)
        ]);

        if (!noticeRes.error) setNotices(noticeRes.data || []);
        if (!timetableRes.error) setTimetable((timetableRes.data || []).map((t: any) => ({
          ...t,
          day: t.day_of_week,
          subject: t.subject_name
        })));
      } catch (err) {
        console.error('Error fetching details:', err);
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStudent, profile?.id]);

  if (parentLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing academic records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <StudentSwitcher />

      <AnimatePresence mode="wait">
        {view === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">
                    {profile?.prefix && <span>{profile.prefix} </span>}
                    {(profile as any)?.full_name || profile?.username}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Parent Profile</p>
                </div>
              </div>
              <p className="text-slate-500 font-medium pt-2">Access additional academic tools and support.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <MenuLink icon={Bell} label="School Notices" sub="Announcements & Alerts" onClick={() => setView('notices')} />
              <MenuLink icon={Clock} label="Class Timetable" sub="Weekly Academic Schedule" onClick={() => setView('timetable')} />
              <MenuLink icon={MessageSquare} label="Queries & Support" sub="Contact Administration" onClick={() => {}} />
              <button 
                onClick={() => setIsLogoutDialogOpen(true)}
                className="w-full p-5 bg-white rounded-[2rem] border shadow-sm flex items-center justify-between group hover:bg-red-50 hover:border-red-200 transition-all active:scale-95"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all shadow-sm">
                    <LogOut className="h-6 w-6 text-red-500 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 group-hover:text-red-600 transition-colors leading-none mb-1">Logout</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-red-400">Terminate secure session</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-red-500 transition-all group-hover:translate-x-1" />
              </button>
            </div>

            <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
              <DialogContent className="rounded-[2rem] max-w-[90vw] md:max-w-md">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl font-black text-slate-900">Logout Confirmation</DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium text-base">
                    Are you sure you want to logout?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-row gap-3 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsLogoutDialogOpen(false)}
                    className="flex-1 h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      setIsLogoutDialogOpen(false);
                      signOut();
                    }}
                    className="flex-1 h-12 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white"
                  >
                    Confirm
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="p-8 text-center bg-slate-100/50 rounded-[3rem] border border-transparent">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Security Standards</p>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-[220px] mx-auto">
                End-to-end encrypted academic data system version 2.4.0 (Stable)
              </p>
            </div>
          </motion.div>
        )}

        {view === 'notices' && (
          <motion.div 
            key="notices"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between gap-4">
              <Button variant="ghost" className="rounded-xl h-10 px-3 hover:bg-slate-100 transition-all" onClick={() => setView('menu')}>
                <ChevronRight className="h-5 w-5 rotate-180" />
                <span className="font-bold text-xs">Back</span>
              </Button>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Notices</h3>
              <div className="w-10 h-10" /> {/* Spacer */}
            </div>

            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {loadingDetails ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing notices...</p>
                  </div>
                ) : notices.length > 0 ? (
                  notices.map((notice) => (
                    <div key={notice.id} className="p-6 bg-white rounded-3xl border border-slate-100 hover:shadow-lg hover:shadow-slate-200/20 transition-all group">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10 border-none rounded-lg text-[10px] font-bold h-6">
                              {notice.category || 'General'}
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {new Date(notice.date).toLocaleDateString()}
                            </span>
                          </div>
                          <h5 className="font-black text-slate-900 text-lg group-hover:text-primary transition-colors">{notice.title}</h5>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed mb-4">{notice.content}</p>
                      {notice.attachment_url && (
                        <Button variant="outline" size="sm" className="rounded-xl font-bold h-9 text-xs" asChild>
                          <a href={notice.attachment_url} target="_blank" rel="noopener noreferrer">View Attachment</a>
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center space-y-4 bg-white rounded-[2rem] border border-dashed">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                      <Bell className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-medium">No notices currently published.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}

        {view === 'timetable' && (
          <motion.div 
            key="timetable"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between gap-4">
              <Button variant="ghost" className="rounded-xl h-10 px-3 hover:bg-slate-100 transition-all" onClick={() => setView('menu')}>
                <ChevronRight className="h-5 w-5 rotate-180" />
                <span className="font-bold text-xs">Back</span>
              </Button>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Timetable</h3>
              <div className="w-10 h-10" /> {/* Spacer */}
            </div>

            {loadingDetails ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Retrieving schedule...</p>
              </div>
            ) : timetable.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                  const daySchedule = timetable.filter(t => t.day === day);
                  if (daySchedule.length === 0) return null;
                  return (
                    <div key={day} className="bg-white rounded-[2.5rem] border shadow-sm p-6 space-y-5">
                      <div className="flex items-center gap-3 pb-3 border-b border-slate-50">
                        <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/20" />
                        <h5 className="font-black text-slate-900 uppercase tracking-widest text-xs">{day}</h5>
                      </div>
                      <div className="space-y-4">
                        {daySchedule.sort((a,b) => a.start_time.localeCompare(b.start_time)).map((slot, i) => (
                          <div key={i} className="flex gap-4 items-center">
                            <div className="shrink-0 text-[10px] font-black text-slate-400 w-16 text-right font-mono">
                              {slot.start_time}
                            </div>
                            <div className="flex-1 p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-primary/20 hover:bg-white transition-all group flex flex-col gap-1">
                              <p className="text-sm font-black text-slate-900 leading-tight group-hover:text-primary transition-colors">{slot.subject}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{slot.teacher_name || 'Classroom Teacher'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center space-y-4 bg-white rounded-[2.5rem] border border-dashed">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-medium">Weekly schedule not yet published.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface MenuLinkProps {
  icon: any;
  label: string;
  sub: string;
  onClick?: () => void;
  isLink?: boolean;
  to?: string;
}

const MenuLink = ({ icon: Icon, label, sub, onClick, isLink, to }: MenuLinkProps) => {
  const content = (
    <>
      <div className="flex items-center gap-4 text-left">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
          <Icon className="h-6 w-6 text-primary group-hover:text-white" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors leading-none mb-1">{label}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-primary/70">{sub}</p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-1" />
    </>
  );

  if (isLink && to) {
    return (
      <Link to={to} className="w-full p-5 bg-white rounded-[2rem] border shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all active:scale-95">
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className="w-full p-5 bg-white rounded-[2rem] border shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all active:scale-95">
      {content}
    </button>
  );
};

export default ParentMore;
