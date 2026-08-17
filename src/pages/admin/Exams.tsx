import { useEffect, useState } from 'react';
import { ConfirmDeleteDialog } from '@/components/admin/ConfirmDeleteDialog';
import ModuleApiActivity from '@/components/admin/ModuleApiActivity';
import { api } from '@/db/api';
import { Exam, Student, Class } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Plus, Calendar, Trash2, ArrowUpCircle, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const examSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  date: z.string().min(1, 'Date is required'),
  target_type: z.enum(['all', 'class', 'section', 'student']),
  target_id: z.string().optional().or(z.literal('')),
});

const promotionSchema = z.object({
  target_class_id: z.string().min(1, 'Target class is required'),
  target_section_id: z.string().min(1, 'Target section is required'),
});

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExamDialogOpen, setIsExamDialogOpen] = useState(false);
  const [isPromotionDialogOpen, setIsPromotionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({ class_id: '', section_id: '' });

  const examForm = useForm<z.infer<typeof examSchema>>({
    resolver: zodResolver(examSchema),
    defaultValues: { title: '', date: '', target_type: 'all', target_id: '' },
  });

  const promotionForm = useForm<z.infer<typeof promotionSchema>>({
    resolver: zodResolver(promotionSchema),
    defaultValues: { target_class_id: '', target_section_id: '' },
  });

  const fetchData = async () => {
    setLoading(true);
    const [examRes, studentRes, classRes] = await Promise.all([
      api.getExams(),
      api.getStudents(),
      api.getClasses()
    ]);
    setExams(examRes.data);
    setStudents(studentRes.data);
    setClasses(classRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onExamSubmit = async (values: z.infer<typeof examSchema>) => {
    try {
      const { error } = await api.createExam({
        ...values,
        target_id: values.target_id || null
      });
      if (error) throw error;
      toast.success('Exam scheduled');
      setIsExamDialogOpen(false);
      examForm.reset();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const onPromotionSubmit = async (values: z.infer<typeof promotionSchema>) => {
    if (selectedStudentIds.length === 0) {
      toast.error('No students selected');
      return;
    }
    try {
      const targetClass = classes.find(c => c.id === values.target_class_id);
      const targetSection = targetClass?.sections.find(s => s.id === values.target_section_id);
      
      const { error } = await api.bulkPromote(
        selectedStudentIds, 
        values.target_class_id, 
        values.target_section_id,
        targetClass?.name || '',
        targetSection?.name || ''
      );
      if (error) throw error;
      toast.success(`Promoted ${selectedStudentIds.length} students`);
      setSelectedStudentIds([]);
      setIsPromotionDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredStudents = students.filter(s => {
    if (filters.class_id && s.class_id !== filters.class_id) return false;
    if (filters.section_id && s.section_id !== filters.section_id) return false;
    return true;
  });

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const toggleSelectStudent = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedStudentIds([...selectedStudentIds, id]);
    } else {
      setSelectedStudentIds(selectedStudentIds.filter(sid => sid !== id));
    }
  };

  const deleteExam = (id: string) => {
    const exam = exams.find(e => e.id === id);
    if (exam) {
      setExamToDelete(exam);
      setDeleteDialogOpen(true);
    }
  };

  const executeDelete = async () => {
    if (!examToDelete) return;
    const { error } = await api.deleteExam(examToDelete.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Exam deleted');
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Exams & Promotion</h1>
        <p className="text-muted-foreground">Manage academic schedules and student promotion dates.</p>
      </div>

      <Tabs defaultValue="exams" className="w-full">
        <TabsList>
          <TabsTrigger value="exams">Upcoming Exams</TabsTrigger>
          <TabsTrigger value="promotion">Batch Promotion</TabsTrigger>
          <TabsTrigger value="api">API Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="exams" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Scheduled Exams</h2>
            <Button onClick={() => setIsExamDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Schedule Exam
            </Button>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {exams.length === 0 ? (
              <p className="text-muted-foreground col-span-full">No exams scheduled.</p>
            ) : (
              exams.map((exam) => (
                <Card key={exam.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-bold">{exam.title}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteExam(exam.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(exam.date).toDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="promotion" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Student Promotion</CardTitle>
              <CardDescription>
                Select students and promote them to a new class and section.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-end gap-4 bg-muted/30 p-4 rounded-lg">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Filter by Class</label>
                  <Select onValueChange={(val) => setFilters({ ...filters, class_id: val, section_id: '' })} value={filters.class_id}>
                    <SelectTrigger className="w-[180px] bg-background">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-classes">All Classes</SelectItem>
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Filter by Section</label>
                  <Select onValueChange={(val) => setFilters({ ...filters, section_id: val })} value={filters.section_id}>
                    <SelectTrigger className="w-[180px] bg-background" disabled={!filters.class_id || filters.class_id === 'all-classes'}>
                      <SelectValue placeholder="All Sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-sections">All Sections</SelectItem>
                      {classes.find(c => c.id === filters.class_id)?.sections.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={() => setFilters({ class_id: '', section_id: '' })}>Clear Filters</Button>
                
                <div className="ml-auto flex items-center gap-3">
                  <div className="text-sm font-medium bg-primary/10 text-primary px-3 py-2 rounded-md">
                    {selectedStudentIds.length} Students Selected
                  </div>
                  <Button disabled={selectedStudentIds.length === 0} onClick={() => setIsPromotionDialogOpen(true)}>
                    <ArrowUpCircle className="w-4 h-4 mr-2" /> Promote Selected
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox 
                          checked={selectedStudentIds.length > 0 && selectedStudentIds.length === filteredStudents.length} 
                          onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                        />
                      </TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Current Class</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Promotion Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8">Loading students...</TableCell></TableRow>
                    ) : filteredStudents.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8">No students found matching filters.</TableCell></TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedStudentIds.includes(student.id)} 
                              onCheckedChange={(checked) => toggleSelectStudent(student.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.class}</TableCell>
                          <TableCell>{student.section}</TableCell>
                          <TableCell>{student.promotion_date || 'Not set'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="api" className="pt-4 overflow-y-auto custom-scrollbar">
          <ModuleApiActivity moduleName="exams" />
        </TabsContent>
      </Tabs>

      <Dialog open={isExamDialogOpen} onOpenChange={setIsExamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Exam</DialogTitle>
          </DialogHeader>
          <Form {...examForm}>
            <form onSubmit={examForm.handleSubmit(onExamSubmit)} className="space-y-4">
              <FormField
                control={examForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Title</FormLabel>
                    <FormControl><Input placeholder="e.g. Mid-Term Examination" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={examForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={examForm.control}
                  name="target_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <Select onValueChange={(val) => {
                        field.onChange(val);
                        examForm.setValue('target_id', '');
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Students</SelectItem>
                          <SelectItem value="class">Specific Class</SelectItem>
                          <SelectItem value="section">Specific Section</SelectItem>
                          <SelectItem value="student">Individual Student</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {examForm.watch('target_type') === 'class' && (
                  <FormField
                    control={examForm.control}
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

                {examForm.watch('target_type') === 'section' && (
                  <FormField
                    control={examForm.control}
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

                {examForm.watch('target_type') === 'student' && (
                  <FormField
                    control={examForm.control}
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
                            {students.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name} ({s.login_id})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsExamDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Schedule Exam</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPromotionDialogOpen} onOpenChange={setIsPromotionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Student Promotion</DialogTitle>
            <DialogDescription>
              Select the new class and section for the {selectedStudentIds.length} selected students.
            </DialogDescription>
          </DialogHeader>
          <Form {...promotionForm}>
            <form onSubmit={promotionForm.handleSubmit(onPromotionSubmit)} className="space-y-4">
              <FormField
                control={promotionForm.control}
                name="target_class_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Class</FormLabel>
                    <Select onValueChange={(val) => {
                      field.onChange(val);
                      promotionForm.setValue('target_section_id', '');
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={promotionForm.control}
                name="target_section_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Section</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger disabled={!promotionForm.watch('target_class_id')}>
                          <SelectValue placeholder="Select target section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.find(c => c.id === promotionForm.watch('target_class_id'))?.sections.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPromotionDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90">Confirm Promotion</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={executeDelete}
        recordName={examToDelete?.title || ""}
      />
    </div>
  );
}
