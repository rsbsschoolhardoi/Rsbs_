import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { StudentQuery, TeacherQuery } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, Send, User, Trash2, Pin, PinOff, Lock, Globe, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';

export default function AdminQueries() {
  const [studentQueries, setStudentQueries] = useState<StudentQuery[]>([]);
  const [teacherQueries, setTeacherQueries] = useState<TeacherQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [selectedQuery, setSelectedQuery] = useState<{id: string, name: string, content: string, is_public: boolean, type: 'student' | 'teacher'} | null>(null);
  const [isReplyPublic, setIsReplyPublic] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [sqRes, tqRes] = await Promise.all([
      api.getQueries(),
      api.getTeacherQueries()
    ]);
    setStudentQueries(sqRes.data || []);
    setTeacherQueries(tqRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const sqChannel = supabase
      .channel('student_queries_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_queries' }, () => {
        fetchData();
      })
      .subscribe();

    const tqChannel = supabase
      .channel('teacher_queries_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_queries' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sqChannel);
      supabase.removeChannel(tqChannel);
    };
  }, []);

  const handleReply = async () => {
    if (!selectedQuery || !replyText.trim()) return;

    try {
      if (selectedQuery.type === 'student') {
        const { error } = await api.replyToQuery(selectedQuery.id, replyText, isReplyPublic);
        if (error) throw error;
      } else {
        const { error } = await api.replyToTeacherQuery(selectedQuery.id, replyText);
        if (error) throw error;
      }
      
      toast.success('Reply sent successfully');
      setReplyText('');
      setSelectedQuery(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const togglePin = async (id: string, isPinned: boolean, type: 'student' | 'teacher' = 'student') => {
    try {
      if (type === 'student') {
        await api.togglePinQuery(id, !isPinned);
      } else {
        await api.togglePinTeacherQuery(id, !isPinned);
      }
      toast.success(!isPinned ? 'Query pinned' : 'Query unpinned');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string, type: 'student' | 'teacher') => {
    if (confirm('Are you sure you want to delete this query?')) {
      try {
        if (type === 'student') {
          await api.deleteQuery(id);
        } else {
          await api.deleteTeacherQuery(id);
        }
        toast.success('Query deleted');
        fetchData();
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const renderQueries = (items: (StudentQuery | TeacherQuery)[], type: 'student' | 'teacher') => {
    if (items.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground uppercase font-black tracking-widest text-xs">
            No {type} queries yet.
          </CardContent>
        </Card>
      );
    }

    return items.map((query) => (
      <Card key={query.id} className={cn(
        "transition-all mb-4 rounded-3xl overflow-hidden border-none shadow-md",
        (query as any).is_pinned ? 'border-primary ring-2 ring-primary/20' : 'border border-primary/5'
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-2xl">
              {type === 'student' ? <User className="w-5 h-5 text-primary" /> : <GraduationCap className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-tight">
                {(query as any).student_name || (query as any).teacher_name}
                {type === 'student' && (
                  <Badge variant="outline" className={cn(
                    "ml-2 text-[8px] font-black uppercase tracking-widest",
                    (query as any).target_type === 'teacher' ? "border-purple-200 text-purple-600 bg-purple-50" : "border-blue-200 text-blue-600 bg-blue-50"
                  )}>
                    To: {(query as any).target_type}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                {format(new Date(query.created_at), 'MMM dd, yyyy - hh:mm a')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(query as any).is_pinned && <Badge variant="default" className="bg-primary text-[8px] font-black uppercase"><Pin className="w-3 h-3 mr-1" /> Pinned</Badge>}
            {query.is_public ? (
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-[8px] font-black uppercase tracking-widest"><Globe className="w-2.5 h-2.5 mr-1" /> Public</Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[8px] font-black uppercase tracking-widest"><Lock className="w-2.5 h-2.5 mr-1" /> Private</Badge>
            )}
            <Badge variant={query.status === 'replied' ? 'secondary' : 'default'} className={cn(
              "text-[8px] font-black uppercase tracking-widest",
              query.status === 'replied' ? 'bg-green-100 text-green-700' : 'bg-orange-500 text-white'
            )}>
              {query.status === 'replied' ? 'Replied' : 'Pending'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm font-bold text-foreground leading-relaxed">{query.content}</p>
          {query.reply_content && (
            <div className="mt-4 bg-muted/30 p-4 rounded-2xl border-l-4 border-primary shadow-inner">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Admin Response</span>
                <span className="text-[9px] text-muted-foreground font-bold uppercase ml-auto">
                  {query.replied_at && format(new Date(query.replied_at as string), 'MMM dd, hh:mm a')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium italic leading-loose whitespace-pre-wrap">"{query.reply_content}"</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end gap-2 py-4 bg-primary/5 border-t border-primary/10">
          <Button variant="ghost" size="sm" className="text-destructive font-black uppercase tracking-widest text-[9px]" onClick={() => handleDelete(query.id, type)}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
          </Button>
          {query.is_public && (
            <Button variant="ghost" size="sm" className="font-black uppercase tracking-widest text-[9px]" onClick={() => togglePin(query.id, (query as any).is_pinned, type)}>
              {(query as any).is_pinned ? <PinOff className="w-3.5 h-3.5 mr-1.5" /> : <Pin className="w-3.5 h-3.5 mr-1.5" />}
              {(query as any).is_pinned ? 'Unpin' : 'Pin'}
            </Button>
          )}
          <Button size="sm" className="rounded-xl h-9 font-black uppercase tracking-widest text-[9px]" onClick={() => {
            setSelectedQuery({
              id: query.id,
              name: (query as any).student_name || (query as any).teacher_name,
              content: query.content,
              is_public: query.is_public,
              type
            });
            setReplyText(query.reply_content || '');
            setIsReplyPublic(query.is_public);
          }}>
            <Send className="w-3.5 h-3.5 mr-1.5" /> {query.reply_content ? 'Edit Reply' : 'Reply Now'}
          </Button>
        </CardFooter>
      </Card>
    ));
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-card p-8 rounded-[2.5rem] shadow-sm border border-primary/5">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-primary">Queries Hub</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Manage feedback from Teachers & Students</p>
        </div>
        <div className="p-4 bg-primary/10 rounded-3xl">
          <MessageSquare className="w-10 h-10 text-primary" />
        </div>
      </div>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="bg-muted/50 p-1.5 rounded-[1.5rem] h-14 mb-8">
          <TabsTrigger value="students" className="rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white">
            <User className="w-3.5 h-3.5 mr-2" />
            Student Queries
          </TabsTrigger>
          <TabsTrigger value="teachers" className="rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white">
            <GraduationCap className="w-3.5 h-3.5 mr-2" />
            Teacher Queries
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="students" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {loading ? (
             <div className="space-y-4">
               {[1, 2, 3].map(i => <div key={i} className="h-40 w-full bg-muted animate-pulse rounded-[2rem]" />)}
             </div>
          ) : renderQueries(studentQueries, 'student')}
        </TabsContent>

        <TabsContent value="teachers" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-40 w-full bg-muted animate-pulse rounded-[2rem]" />)}
            </div>
          ) : renderQueries(teacherQueries, 'teacher')}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedQuery} onOpenChange={(open) => !open && setSelectedQuery(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
          <DialogHeader className="p-8 bg-primary text-white">
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-white/20 text-white border-none font-black uppercase tracking-widest text-[9px]">Respond to {selectedQuery?.type}</Badge>
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight leading-tight">Response to {selectedQuery?.name}</DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6 bg-card">
            <div className="bg-muted/50 p-4 rounded-2xl text-xs font-bold leading-relaxed border-l-4 border-primary italic">
              "{selectedQuery?.content}"
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Admin Response Message</Label>
              <Textarea 
                placeholder="TYPE YOUR RESPONSE HERE..." 
                className="h-32 rounded-2xl bg-primary/5 border-primary/10 focus:bg-white focus:border-primary transition-all p-4 text-sm font-medium"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
            </div>
            {selectedQuery?.type === 'student' && (
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
                <div className="space-y-0.5">
                  <Label htmlFor="reply-public" className="cursor-pointer text-[11px] font-black uppercase tracking-tight">Public Response</Label>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Visible to all students</p>
                </div>
                <Switch id="reply-public" checked={isReplyPublic} onCheckedChange={setIsReplyPublic} />
              </div>
            )}
          </div>
          <DialogFooter className="p-8 bg-primary/5 gap-4">
            <Button variant="outline" className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest text-[10px]" onClick={() => setSelectedQuery(null)}>Discard</Button>
            <Button className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20" onClick={handleReply} disabled={!replyText.trim()}>Send Response</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
