import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { StudentQuery, Teacher } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, Send, User, Globe, Lock, Pin, Clock, HelpCircle, CheckCircle2, ShieldCheck, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from '@/db/supabase';

export default function StudentQueriesModule() {
  const { profile } = useAuth();
  const [queries, setQueries] = useState<StudentQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryText, setQueryText] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');
  const [targetType, setTargetType] = useState<'admin' | 'teacher'>('admin');
  const [classTeacher, setClassTeacher] = useState<Teacher | null>(null);

  const quickOptions = [
    "Is today a holiday?",
    "Reason for today’s holiday",
    "Any special event today?",
    "Today’s exam details",
    "Important updates today"
  ];

  const fetchClassTeacher = async () => {
    if (!profile?.student_id) return;
    try {
      const { data: student } = await api.getStudentById(profile.student_id);
      if (!student?.class_id || !student?.section_id) return;
      
      const { data: assignments } = await api.getClassTeacherAssignments();
      const assignment = assignments?.find(
        (a: any) => a.class_id === student.class_id && a.section_id === student.section_id
      );
      if (assignment) {
        const { data: teachers } = await api.getTeachers();
        const teacher = teachers?.find(t => t.id === assignment.teacher_id);
        setClassTeacher(teacher || null);
      }
    } catch (err) {
      console.error("Error fetching class teacher:", err);
    }
  };

  const fetchQueries = async () => {
    if (!profile?.student_id) return;
    setLoading(true);
    const { data } = await api.getQueries(profile.student_id);
    setQueries(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchQueries();
    fetchClassTeacher();

    const channel = supabase
      .channel('student_queries_module')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_queries' }, () => {
        fetchQueries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.student_id]);

  const handleSubmit = async (content: string) => {
    if (!profile?.student_id || !content.trim()) return;

    try {
      const { data: student } = await api.getStudentById(profile.student_id);
      if (!student) throw new Error('Student profile not found');

      const { error } = await api.createQuery(
        student.id, 
        student.name, 
        content, 
        isPublic,
        targetType,
        targetType === 'teacher' ? classTeacher?.id : undefined
      );
      if (error) throw error;

      toast.success(`Your query has been sent to ${targetType === 'admin' ? 'Admin' : 'Class Teacher'}.`);
      setQueryText('');
      fetchQueries();
      setActiveTab('feed');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const pinnedQueries = queries.filter(q => q.is_pinned);
  const otherQueries = queries.filter(q => !q.is_pinned);
  const myQueries = queries.filter(q => q.student_id === profile?.student_id);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Ask a Question */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader className="bg-primary/5 border-b pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <HelpCircle className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Student Helpdesk</CardTitle>
              </div>
              <CardDescription>Get quick answers from school administration.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Quick Ask</h3>
                <div className="grid grid-cols-1 gap-2">
                  {quickOptions.map((opt) => (
                    <Button 
                      key={opt} 
                      variant="outline" 
                      className="justify-start h-auto py-3 px-4 text-left font-medium hover:bg-primary/5 border-primary/10"
                      onClick={() => handleSubmit(opt)}
                    >
                      <MessageSquare className="w-4 h-4 mr-3 text-primary" />
                      {opt}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-muted">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Send Message To:</h3>
                <RadioGroup 
                  defaultValue="admin" 
                  value={targetType} 
                  onValueChange={(val: any) => setTargetType(val)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2 bg-muted/50 px-4 py-2 rounded-xl border border-muted cursor-pointer hover:bg-primary/5 transition-colors">
                    <RadioGroupItem value="admin" id="target-admin" />
                    <Label htmlFor="target-admin" className="text-xs font-bold cursor-pointer flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-primary" /> Admin
                    </Label>
                  </div>
                  <div className={`flex items-center space-x-2 bg-muted/50 px-4 py-2 rounded-xl border border-muted cursor-pointer hover:bg-primary/5 transition-colors ${!classTeacher ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
                    <RadioGroupItem value="teacher" id="target-teacher" disabled={!classTeacher} />
                    <Label htmlFor="target-teacher" className="text-xs font-bold cursor-pointer flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-primary" /> My Class Teacher
                    </Label>
                  </div>
                </RadioGroup>
                
                {targetType === 'teacher' && classTeacher && (
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest bg-primary/5 p-2 rounded-lg text-center animate-in fade-in zoom-in duration-300">
                    Recipient: {classTeacher.name}
                  </p>
                )}

                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest pt-2">Custom Query</h3>
                <Textarea 
                  placeholder="Type your question here..." 
                  className="min-h-[120px] resize-none border-primary/10 focus-visible:ring-primary/30"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                />
                <div className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsPublic(!isPublic)}>
                    <Switch checked={isPublic} onCheckedChange={setIsPublic} id="public-toggle" />
                    <Label htmlFor="public-toggle" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                      {isPublic ? <Globe className="w-3.5 h-3.5 text-blue-600" /> : <Lock className="w-3.5 h-3.5 text-amber-600" />}
                      {isPublic ? 'Visible to All' : 'Private to Admin'}
                    </Label>
                  </div>
                  <Button 
                    className="flex-1 shadow-md shadow-primary/20" 
                    onClick={() => handleSubmit(queryText)} 
                    disabled={!queryText.trim()}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Interaction Feed */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-4 bg-muted/30 p-1.5 rounded-2xl border border-muted">
              <TabsList className="bg-transparent border-none">
                <TabsTrigger value="feed" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Public Feed
                </TabsTrigger>
                <TabsTrigger value="my-queries" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  My Inquiries
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="feed" className="mt-0 space-y-4">
              {loading ? (
                <div className="py-20 text-center text-muted-foreground animate-pulse">Loading feed...</div>
              ) : queries.filter(q => q.is_public || q.student_id === profile?.student_id).length === 0 ? (
                <Card className="border-dashed py-20 bg-muted/10">
                  <CardContent className="text-center space-y-2">
                    <p className="text-muted-foreground font-medium">No public queries available yet.</p>
                    <p className="text-sm text-muted-foreground">Be the first one to ask a question!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Pinned Queries */}
                  {pinnedQueries.map((query) => (
                    <QueryCard key={query.id} query={query} isPinned currentStudentId={profile?.student_id} />
                  ))}
                  {/* Other Queries */}
                  {otherQueries.filter(q => q.is_public || q.student_id === profile?.student_id).map((query) => (
                    <QueryCard key={query.id} query={query} currentStudentId={profile?.student_id} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="my-queries" className="mt-0 space-y-4">
              {myQueries.length === 0 ? (
                <Card className="border-dashed py-20 bg-muted/10">
                  <CardContent className="text-center">
                    <p className="text-muted-foreground font-medium">You haven't sent any queries yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {myQueries.map((query) => (
                    <QueryCard key={query.id} query={query} currentStudentId={profile?.student_id} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function QueryCard({ query, isPinned, currentStudentId }: { query: StudentQuery; isPinned?: boolean; currentStudentId?: string | null }) {
  const isMine = query.student_id === currentStudentId;

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md border border-muted bg-background group ${isPinned ? 'ring-2 ring-primary/20 border-primary/30' : ''}`}>
      <CardHeader className={`py-4 px-6 border-b border-muted/50 ${isPinned ? 'bg-primary/5' : 'bg-muted/10'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${isMine ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <User className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                {query.student_name}
                {isMine && <Badge variant="secondary" className="h-5 text-[10px] px-1.5 uppercase font-bold tracking-wider">You</Badge>}
              </CardTitle>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {format(new Date(query.created_at), 'MMM dd, hh:mm a')}
                <span className="mx-1 opacity-30">-</span>
                {query.is_public ? (
                  <span className="flex items-center gap-1 text-blue-600 font-bold"><Globe className="w-3 h-3" /> Public</span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 font-bold"><Lock className="w-3 h-3" /> Private</span>
                )}
                <span className="mx-1 opacity-30">-</span>
                <span className="flex items-center gap-1 text-purple-600 font-bold uppercase tracking-widest">
                  {query.target_type === 'teacher' ? <GraduationCap className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  {query.target_type}
                </span>
              </div>
            </div>
          </div>
          {isPinned && (
            <Badge variant="default" className="bg-primary px-3 py-1 shadow-sm animate-pulse">
              <Pin className="w-3 h-3 mr-1" /> Important Announcement
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-6 px-6">
        <p className="text-foreground text-sm leading-relaxed font-medium">
          {query.content}
        </p>

        {query.reply_content ? (
          <div className="mt-6 bg-primary/5 p-4 rounded-2xl border border-primary/10 shadow-inner">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-primary/20 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-extrabold text-primary tracking-widest uppercase">Official Response</span>
              <span className="text-[10px] text-muted-foreground ml-auto font-medium">
                {query.replied_at && format(new Date(query.replied_at as string), 'MMM dd, hh:mm a')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              "{query.reply_content}"
            </p>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-muted-foreground">
            <Badge variant="outline" className="text-[10px] font-bold py-1 bg-muted/30">Awaiting Response</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
