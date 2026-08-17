import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherQuery, Teacher } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  HelpCircle, 
  Clock, 
  CheckCircle2, 
  Lock, 
  Globe,
  Plus,
  ArrowLeft,
  GraduationCap,
  ShieldCheck,
  User
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { StudentQuery } from '@/types';
import { supabase } from '@/db/supabase';

export default function TeacherQueries() {
  const { profile } = useAuth();
  const [queries, setQueries] = useState<TeacherQuery[]>([]);
  const [studentQueries, setStudentQueries] = useState<StudentQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState('admin');
  
  const [newQueryContent, setNewQueryContent] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const teacherId = profile?.teacher_id;

  const fetchData = async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const [queriesRes, studentQueriesRes, teachersRes] = await Promise.all([
        api.getTeacherQueries(teacherId),
        api.getQueries(undefined, teacherId),
        api.getTeachers()
      ]);
      
      const currentTeacher = teachersRes.data?.find(t => t.id === teacherId);
      setTeacher(currentTeacher || null);
      
      setQueries(queriesRes.data || []);
      setStudentQueries(studentQueriesRes.data || []);
    } catch (err) {
      console.error("Queries fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const sqChannel = supabase
      .channel(`student_queries_teacher_${teacherId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'student_queries',
        filter: `target_teacher_id=eq.${teacherId}`
      }, () => {
        fetchData();
      })
      .subscribe();

    const tqChannel = supabase
      .channel(`teacher_queries_teacher_${teacherId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'teacher_queries'
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sqChannel);
      supabase.removeChannel(tqChannel);
    };
  }, [teacherId]);

  const handleSubmit = async () => {
    if (!teacherId || !teacher || !newQueryContent.trim()) return;
    
    setSubmitting(true);
    try {
      const { data, error } = await api.createTeacherQuery(
        teacherId,
        teacher.name,
        newQueryContent,
        isPublic
      );
      
      if (error) throw error;
      
      if (data) {
        setQueries([data, ...queries]);
        setNewQueryContent('');
        setIsAdding(false);
        toast.success("Query submitted successfully");
      }
    } catch (err) {
      console.error("Submit query error:", err);
      toast.error("Failed to submit query");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-40 w-full rounded-[2.5rem]" />
        <div className="space-y-4 pt-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-[2.2rem]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black uppercase tracking-widest text-primary">Quick Query</h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Ask Admin & Get Solutions</p>
      </div>

      {isAdding ? (
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="bg-primary/5 p-6 border-b border-primary/10">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-primary/10 rounded-xl">
                   <Plus className="w-5 h-5 text-primary" />
                 </div>
                 <h3 className="text-sm font-black uppercase tracking-widest text-primary">New Query</h3>
               </div>
               <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)} className="rounded-full">
                 <ArrowLeft className="w-4 h-4" />
               </Button>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Message to Admin</Label>
              <Textarea 
                placeholder="TYPE YOUR QUERY HERE..."
                className="min-h-[150px] rounded-[1.5rem] border-primary/10 bg-primary/5 focus:bg-white focus:border-primary transition-all p-6 text-sm font-medium leading-relaxed"
                value={newQueryContent}
                onChange={(e) => setNewQueryContent(e.target.value)}
              />
            </div>
            
            <div className="flex items-center justify-between px-2">
              <div className="space-y-0.5">
                <Label className="text-xs font-black uppercase tracking-tight">Public Query</Label>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Visible to other teachers</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            <Button 
              className="w-full h-14 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
              disabled={submitting || !newQueryContent.trim()}
              onClick={handleSubmit}
            >
              {submitting ? "SUBMITTING..." : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  SUBMIT QUERY
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button 
          onClick={() => setIsAdding(true)}
          className="w-full h-16 rounded-[2rem] bg-gradient-to-r from-primary to-primary/80 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 group transition-all"
        >
          <Plus className="w-6 h-6 mr-3 group-hover:rotate-90 transition-transform" />
          Ask New Query
        </Button>
      )}

      <div className="space-y-4 pt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/50 p-1.5 rounded-[1.5rem] h-14 mb-8 w-full">
            <TabsTrigger value="admin" className="flex-1 rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white">
              <ShieldCheck className="w-3.5 h-3.5 mr-2" />
              My Admin Queries
            </TabsTrigger>
            <TabsTrigger value="students" className="flex-1 rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white">
              <User className="w-3.5 h-3.5 mr-2" />
              Student Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="admin" className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
            {queries.length > 0 ? (
              queries.map((query) => (
                <TeacherQueryCard key={query.id} query={query} />
              ))
            ) : (
              <EmptyState icon={<HelpCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />} text="No admin queries found" />
            )}
          </TabsContent>

          <TabsContent value="students" className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
            {studentQueries.length > 0 ? (
              studentQueries.map((query) => (
                <StudentQueryCard key={query.id} query={query} teacherId={teacherId || ''} onReplied={fetchData} />
              ))
            ) : (
              <EmptyState icon={<MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />} text="No student messages found" />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2">Notice</p>
        <p className="text-[11px] font-bold text-muted-foreground leading-relaxed">
          Queries are directly handled by the Admin team. You will be notified once a reply is posted.
        </p>
      </div>
    </div>
  );
}


function TeacherQueryCard({ query }: { query: TeacherQuery }) {
  return (
    <Card className="border-none shadow-md rounded-[2.2rem] bg-card overflow-hidden border-l-4 border-primary/20">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            {query.is_public ? (
              <Badge className="bg-blue-500 hover:bg-blue-600 text-[8px] font-black uppercase tracking-widest px-2">
                <Globe className="w-2.5 h-2.5 mr-1" />
                Public
              </Badge>
            ) : (
              <Badge className="bg-gray-500 hover:bg-gray-600 text-[8px] font-black uppercase tracking-widest px-2">
                <Lock className="w-2.5 h-2.5 mr-1" />
                Private
              </Badge>
            )}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="text-[9px] font-bold uppercase">{format(new Date(query.created_at), 'dd MMM yyyy')}</span>
            </div>
          </div>
          <Badge variant={query.status === 'replied' ? 'default' : 'secondary'} className={cn(
            "text-[8px] font-black uppercase tracking-widest px-2",
            query.status === 'replied' ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600 text-white"
          )}>
            {query.status}
          </Badge>
        </div>

        <p className="text-xs font-bold text-foreground leading-relaxed mb-4">
          {query.content}
        </p>

        {query.status === 'replied' && query.reply_content && (
          <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 relative">
            <div className="absolute -top-2.5 left-4 px-2 bg-background border border-primary/10 rounded-full text-[8px] font-black uppercase tracking-widest text-primary">
              Admin Reply
            </div>
            <p className="text-xs text-muted-foreground font-medium italic leading-relaxed">
              "{query.reply_content}"
            </p>
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span className="text-[9px] font-black uppercase text-green-600/70 tracking-widest">Answered</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StudentQueryCard({ query, teacherId, onReplied }: { query: StudentQuery, teacherId: string, onReplied: () => void }) {
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await api.replyToQuery(query.id, replyText);
      if (error) throw error;
      toast.success("Reply sent successfully");
      setReplyText('');
      onReplied();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-none shadow-md rounded-[2.2rem] bg-card overflow-hidden border-l-4 border-primary/20">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-tight">{query.student_name}</p>
              <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                 <Clock className="w-3 h-3" />
                 {format(new Date(query.created_at), 'dd MMM, hh:mm a')}
              </div>
            </div>
          </div>
          <Badge variant={query.status === 'replied' ? 'default' : 'secondary'} className={cn(
            "text-[8px] font-black uppercase tracking-widest px-2",
            query.status === 'replied' ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600 text-white"
          )}>
            {query.status}
          </Badge>
        </div>

        <p className="text-xs font-bold text-foreground leading-relaxed mb-4">
          {query.content}
        </p>

        {query.status === 'replied' && query.reply_content ? (
          <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 relative">
            <div className="absolute -top-2.5 left-4 px-2 bg-background border border-primary/10 rounded-full text-[8px] font-black uppercase tracking-widest text-primary">
              My Reply
            </div>
            <p className="text-xs text-muted-foreground font-medium italic leading-relaxed">
              "{query.reply_content}"
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
             <Textarea 
               placeholder="REPLY TO STUDENT..."
               className="min-h-[80px] rounded-2xl bg-primary/5 border-primary/10 p-4 text-xs font-medium"
               value={replyText}
               onChange={(e) => setReplyText(e.target.value)}
             />
             <Button 
               size="sm" 
               className="w-full rounded-2xl h-10 font-black uppercase tracking-widest text-[9px]"
               disabled={isSubmitting || !replyText.trim()}
               onClick={handleReply}
             >
               <Send className="w-3.5 h-3.5 mr-2" />
               Send Reply
             </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <Card className="border-dashed border-2 rounded-[2.2rem]">
      <CardContent className="p-16 text-center">
        {icon}
        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">{text}</p>
      </CardContent>
    </Card>
  );
}
