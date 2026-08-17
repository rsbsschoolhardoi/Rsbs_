import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Notice, Teacher } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Megaphone, 
  Calendar, 
  ChevronRight, 
  Bell, 
  Clock,
  LayoutDashboard,
  Search,
  Filter,
  Plus,
  Target,
  Globe,
  Users
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TeacherNotices() {
  const { profile } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [allowPublic, setAllowPublic] = useState(false);
  
  // New Notice State
  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    visibility_scope: 'classes', // 'classes', 'all'
    target_id: 'all_assigned',
    expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const teacherId = profile?.teacher_id;

  const fetchData = async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const [noticesRes, teachersRes, settingsRes] = await Promise.all([
        api.getNotices(),
        api.getTeachers(),
        api.getModuleSettings()
      ]);
      
      const currentTeacher = teachersRes.data?.find(t => t.id === teacherId);
      setTeacher(currentTeacher || null);

      const publicSetting = settingsRes.data?.find(s => s.module_id === 'allow_teacher_public_notices');
      setAllowPublic(publicSetting?.is_enabled ?? false);
      
      if (currentTeacher && noticesRes.data) {
        const assignedClassIds = (currentTeacher.class_assignments || []).map(a => a.class_id);
        
        const filtered = noticesRes.data.filter(notice => {
          // Admin override: admins see everything (handled in admin panel)
          // For teacher panel: see their own + public + targeted to their classes
          if (notice.author_id === teacherId) return true;
          const targetAudience = (notice as any).target_audience;
          if (targetAudience === 'all' || targetAudience === 'teachers') return true;
          if (targetAudience === 'classes' && notice.target_classes) {
            return notice.target_classes.some(id => assignedClassIds.includes(id));
          }
          return false;
        });
        
        setNotices(filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
    } catch (err) {
      console.error("Notices fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('notices_teacher')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId]);

  const handleCreateNotice = async () => {
    if (!teacherId || !teacher) return;
    if (!newNotice.title || !newNotice.content) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const assignedClassIds = (teacher.class_assignments || []).map(a => a.class_id);
      
      const noticeData = {
        title: newNotice.title,
        content: newNotice.content,
        author_id: teacherId,
        author_role: 'teacher',
        visibility_scope: newNotice.visibility_scope,
        target_audience: newNotice.visibility_scope === 'all' ? 'all' : 'classes',
        target_classes: newNotice.visibility_scope === 'all' ? null : 
                       (newNotice.target_id === 'all_assigned' || !newNotice.target_id) ? assignedClassIds : [newNotice.target_id],
        expiry_date: newNotice.expiry_date,
        target_type: newNotice.visibility_scope === 'all' ? 'all' : 'class',
        target_id: newNotice.visibility_scope === 'all' ? null : (newNotice.target_id === 'all_assigned' ? null : (newNotice.target_id || null))
      };

      const { error } = await api.createNotice(noticeData);
      if (error) throw error;

      toast.success("Notice published successfully");
      setIsCreateOpen(false);
      setNewNotice({
        title: '',
        content: '',
        visibility_scope: 'classes',
        target_id: 'all_assigned',
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish notice");
    }
  };

  const filteredNotices = notices.filter(notice => 
    notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notice.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="space-y-4 pt-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-[2rem]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-black uppercase tracking-widest text-primary">Notices</h1>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl h-11 bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> Post New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg w-[95%] rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden">
            <DialogHeader className="p-8 bg-primary text-white">
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">Create Notice</DialogTitle>
            </DialogHeader>
            <div className="p-8 space-y-6 bg-card">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Notice Title</label>
                <Input 
                  placeholder="E.G. UPCOMING EXAM PREP"
                  className="rounded-2xl bg-primary/5 border-primary/10 h-12 text-sm font-bold"
                  value={newNotice.title}
                  onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Visibility Scope</label>
                <Select 
                  value={newNotice.visibility_scope} 
                  onValueChange={(val) => setNewNotice({ ...newNotice, visibility_scope: val })}
                >
                  <SelectTrigger className="rounded-2xl bg-primary/5 border-primary/10 h-12 text-sm font-bold">
                    <SelectValue placeholder="Select Visibility" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="classes">My Assigned Class(es)</SelectItem>
                    {allowPublic && <SelectItem value="all">Public (Everyone)</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {newNotice.visibility_scope === 'classes' && teacher?.class_assignments && teacher.class_assignments.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Target Specific Class</label>
                  <Select 
                    value={newNotice.target_id} 
                    onValueChange={(val) => setNewNotice({ ...newNotice, target_id: val })}
                  >
                    <SelectTrigger className="rounded-2xl bg-primary/5 border-primary/10 h-12 text-sm font-bold">
                      <SelectValue placeholder="All My Classes" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="all_assigned">All Assigned Classes</SelectItem>
                      {teacher.class_assignments.map((assignment) => (
                        <SelectItem key={assignment.id} value={assignment.class_id}>
                          Class {assignment.class_name} - {assignment.section_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Notice Content</label>
                <Textarea 
                  placeholder="WRITE THE ANNOUNCEMENT DETAILS..."
                  className="min-h-[120px] rounded-2xl bg-primary/5 border-primary/10 p-4 text-sm font-medium leading-relaxed"
                  value={newNotice.content}
                  onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Expiry Date</label>
                <Input 
                  type="date"
                  className="rounded-2xl bg-primary/5 border-primary/10 h-12 text-sm font-bold"
                  value={newNotice.expiry_date}
                  onChange={(e) => setNewNotice({ ...newNotice, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="p-8 bg-muted/30">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateOpen(false)}
                className="rounded-2xl h-12 font-black uppercase tracking-widest text-[10px]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateNotice}
                className="rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 bg-primary"
              >
                Publish Notice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <Input 
          placeholder="SEARCH NOTICES..." 
          className="pl-12 h-14 bg-card/50 backdrop-blur-sm border-primary/10 rounded-[1.5rem] font-bold uppercase tracking-widest text-xs focus:bg-card focus:shadow-xl transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4 pt-2">
        {filteredNotices.length > 0 ? (
          filteredNotices.map((notice) => (
            <Dialog key={notice.id}>
              <DialogTrigger asChild>
                <button className="w-full text-left transition-all active:scale-[0.98]">
                  <Card className="border-none shadow-md rounded-[2.2rem] bg-card hover:shadow-xl transition-all overflow-hidden border-b-4 border-primary/20">
                    <CardHeader className="p-6 pb-2">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2",
                              notice.target_audience === 'teachers' ? "bg-purple-500 hover:bg-purple-600" :
                              notice.target_audience === 'all' ? "bg-blue-500 hover:bg-blue-600" : "bg-primary"
                            )}>
                              {notice.target_audience}
                            </Badge>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span className="text-[9px] font-bold uppercase">{format(new Date(notice.created_at), 'dd MMM yyyy')}</span>
                            </div>
                          </div>
                          <CardTitle className="text-base font-black text-foreground line-clamp-2 uppercase tracking-tight">{notice.title}</CardTitle>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                          <Megaphone className="w-5 h-5" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                        {notice.content}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-primary/5">
                         <div className="flex items-center gap-2">
                           <Clock className="w-3 h-3 text-muted-foreground" />
                           <span className="text-[9px] font-bold uppercase text-muted-foreground">Expires {format(new Date(notice.expiry_date), 'dd MMM')}</span>
                         </div>
                         <div className="flex items-center gap-1.5 text-primary">
                           <span className="text-[10px] font-black uppercase tracking-widest">Read More</span>
                           <ChevronRight className="w-4 h-4" />
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-lg w-[90%] rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
                <DialogHeader className="bg-primary p-8 text-white relative">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
                   <Megaphone className="w-12 h-12 mb-4 text-white opacity-40" />
                   <Badge className="w-fit bg-white/20 text-white border-none text-[10px] font-black uppercase tracking-widest mb-2">
                     {notice.target_audience} Notice
                   </Badge>
                   <DialogTitle className="text-2xl font-black uppercase tracking-tight text-left leading-tight">
                     {notice.title}
                   </DialogTitle>
                </DialogHeader>
                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto bg-card">
                  <div className="flex items-center gap-6 border-b border-primary/5 pb-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Published</p>
                      <p className="text-sm font-bold">{format(new Date(notice.created_at), 'MMMM dd, yyyy')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Expiry</p>
                      <p className="text-sm font-bold">{format(new Date(notice.expiry_date), 'MMMM dd, yyyy')}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm leading-loose text-muted-foreground font-medium whitespace-pre-wrap">
                      {notice.content}
                    </p>
                  </div>
                  {notice.target_classes && notice.target_classes.length > 0 && (
                    <div className="pt-4 space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Targeted Classes</p>
                      <div className="flex flex-wrap gap-2">
                        {notice.target_classes.map(id => (
                          <Badge key={id} variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-primary/20 text-primary">Class ID: {id}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ))
        ) : (
          <Card className="border-dashed border-2 rounded-[2rem]">
            <CardContent className="p-16 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30 animate-bounce" />
              <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">No matching notices found</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="p-6 bg-secondary/30 rounded-[2.5rem] border-2 border-dashed border-primary/10 text-center">
        <LayoutDashboard className="w-8 h-8 mx-auto mb-3 text-primary/40" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
          Stay updated with school events and announcements. Check this panel daily for new updates.
        </p>
      </div>
    </div>
  );
}
