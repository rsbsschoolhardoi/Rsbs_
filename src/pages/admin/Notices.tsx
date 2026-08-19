import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModuleApiActivity from '@/components/admin/ModuleApiActivity';
import { api } from '@/db/api';
import { Notice } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Plus, Megaphone, Trash2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Class, Student } from '@/types';

const noticeSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  content: z.string().min(5, 'Content is required'),
  is_blue_tag: z.boolean(),
  target_audience: z.enum(['all', 'teachers', 'students', 'classes']),
  target_classes: z.array(z.string()).nullable().optional(),
  expiry_date: z.string().min(1, 'Expiry date is required'),
  target_type: z.enum(['all', 'class', 'section', 'student']),
  target_id: z.string().optional().or(z.literal('')),
});

type NoticeFormValues = z.infer<typeof noticeSchema>;

import { getLocalDateString } from '@/lib/utils';

export default function Notices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<NoticeFormValues>({
    resolver: zodResolver(noticeSchema),
    defaultValues: { 
      title: '', 
      content: '', 
      is_blue_tag: false, 
      target_audience: 'all',
      target_classes: [],
      expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      target_type: 'all', 
      target_id: '' 
    },
  });

  const fetchData = async () => {
    setLoading(true);
    const [noticeRes, classesRes, studentRes] = await Promise.all([
      api.getNotices(),
      api.getClasses(),
      api.getStudents()
    ]);
    setNotices(noticeRes.data);
    setClasses(classesRes.data);
    setAllStudents(studentRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('notices_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onSubmit = async (values: NoticeFormValues) => {
    try {
      const { error } = await api.createNotice({
        ...values,
        target_id: values.target_id || null,
        target_classes: (values.target_audience === 'classes' && values.target_id) ? [values.target_id] : null,
      });
      if (error) throw error;
      toast.success('Notice published');
      setIsDialogOpen(false);
      form.reset();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteNotice = async (id: string) => {
    if (confirm('Delete this notice?')) {
      const { error } = await api.deleteNotice(id);
      if (error) toast.error(error.message);
      else {
        toast.success('Notice deleted');
        fetchData();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notice & Announcements</h1>
          <p className="text-muted-foreground">Publish and manage school notices for everyone to see.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Post Notice
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list">All Notices</TabsTrigger>
          <TabsTrigger value="api">API Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <div className="grid gap-6">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">Loading notices...</p>
            ) : notices.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                  <Megaphone className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No notices posted yet.</p>
                </CardContent>
              </Card>
            ) : (
              notices.map((notice) => (
                <Card key={notice.id} className={notice.is_blue_tag ? 'border-primary/50' : ''}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {notice.title}
                      {notice.is_blue_tag && (
                        <Badge variant="secondary" className="bg-info/10 text-info hover:bg-info/10 border-blue-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                        </Badge>
                      )}
                      {(notice as any).author_role === 'teacher' && (
                        <Badge variant="outline" className="text-xs font-bold border-purple-200 text-accent bg-purple-50">
                          Teacher Post
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{new Date(notice.created_at).toLocaleDateString()}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteNotice(notice.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{notice.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="api" className="pt-4 overflow-y-auto custom-scrollbar">
          <ModuleApiActivity moduleName="notices" />
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post New Notice</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notice Title</FormLabel>
                    <FormControl><Input placeholder="Important Announcement" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notice Content</FormLabel>
                    <FormControl><Textarea placeholder="Write the announcement details here..." className="h-32" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="target_audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audience Category</FormLabel>
                      <Select onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue('target_type', val === 'classes' ? 'class' : 'all');
                        form.setValue('target_id', '');
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Everyone</SelectItem>
                          <SelectItem value="students">Students Only</SelectItem>
                          <SelectItem value="teachers">Teachers Only</SelectItem>
                          <SelectItem value="classes">Specific Classes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiry_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="target_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specific Target</FormLabel>
                      <Select onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue('target_id', '');
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">General</SelectItem>
                          <SelectItem value="class">Class</SelectItem>
                          <SelectItem value="section">Section</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {form.watch('target_type') === 'class' && (
                  <FormField
                    control={form.control}
                    name="target_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Class</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

                {form.watch('target_type') === 'section' && (
                  <FormField
                    control={form.control}
                    name="target_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Section</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classes.flatMap(c => c.sections.map(s => (
                              <SelectItem key={s.id} value={s.id}>{c.name} - {s.name}</SelectItem>
                            )))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

                {form.watch('target_type') === 'student' && (
                  <FormField
                    control={form.control}
                    name="target_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Student</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Search student" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allStudents.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name} ({s.login_id})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
              </div>
              <FormField
                control={form.control}
                name="is_blue_tag"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Blue Tag Highlight</FormLabel>
                      <FormDescription>Mark this notice as verified/important with a blue tag.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Publish Notice</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
