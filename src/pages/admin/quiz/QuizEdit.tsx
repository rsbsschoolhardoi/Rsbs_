import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Reorder } from 'framer-motion';
import { Save, Plus, Upload, Eye, BarChart3, ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuizSettingsForm } from '@/components/quiz/QuizSettingsForm';
import { QuestionForm } from '@/components/quiz/QuestionForm';
import { api } from '@/db/api';
import { ROUTES } from '@/constants/routes';
import { toast } from 'sonner';
import type { Quiz, Question, QuestionOption, QuizAssignment, Student, Class } from '@/types';
import { cn } from '@/lib/utils';

const blankQuestion = (quizId: string): Question => ({
  id: '',
  quiz_id: quizId,
  question_text: '',
  image_url: null,
  explanation: null,
  marks: 1,
  difficulty: 'medium',
  subject: null,
  chapter: null,
  topic: null,
  question_id: null,
  metadata: {},
  order_index: 0,
  created_at: '',
  updated_at: '',
  options: [
    { id: '', question_id: '', option_text: '', is_correct: false, order_index: 0, created_at: '' },
    { id: '', question_id: '', option_text: '', is_correct: false, order_index: 1, created_at: '' },
  ],
});

export default function QuizEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Partial<Quiz> | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignments, setAssignments] = useState<QuizAssignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('questions');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [quizRes, questionsRes, assignmentsRes, classesRes, studentsRes] = await Promise.all([
        api.getQuizById(id),
        api.getQuizQuestions(id),
        api.getQuizAssignments(id),
        api.getClasses(),
        api.getStudents(),
      ]);
      setQuiz(quizRes.data);
      setQuestions(questionsRes.data.length ? questionsRes.data : [blankQuestion(id)]);
      setAssignments(assignmentsRes.data || []);
      setClasses((classesRes.data || []) as Class[]);
      setStudents(studentsRes.data || []);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleSaveQuiz = async () => {
    if (!id || !quiz) return;
    setSaving(true);
    try {
      const { error } = await api.updateQuiz(id, quiz);
      if (error) {
        console.error('Failed to save quiz:', error);
        toast.error(`Failed to save quiz: ${error.message || 'Unknown error'}`);
        setSaving(false);
        return;
      }
      toast.success('Quiz saved');
    } catch (err) {
      console.error('Failed to save quiz (exception):', err);
      toast.error(`Failed to save quiz: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuestions = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await api.saveQuizQuestions(id, questions);
      if (error) {
        console.error('Failed to save questions:', error);
        toast.error(`Failed to save questions: ${error.message || 'Unknown error'}`);
        setSaving(false);
        return;
      }
      const { data: reloaded } = await api.getQuizQuestions(id);
      setQuestions(reloaded.length ? reloaded : [blankQuestion(id)]);
      toast.success('Questions saved');
    } catch (err) {
      console.error('Failed to save questions (exception):', err);
      toast.error(`Failed to save questions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAssignments = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await api.setQuizAssignments(id, assignments);
      if (error) {
        console.error('Failed to save assignments:', error);
        toast.error(`Failed to save assignments: ${error.message || 'Unknown error'}`);
        setSaving(false);
        return;
      }
      toast.success('Assignments saved');
    } catch (err) {
      console.error('Failed to save assignments (exception):', err);
      toast.error(`Failed to save assignments: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    if (!id) return;
    setQuestions((prev) => [...prev, blankQuestion(id)]);
  };

  const duplicateQuestion = (idx: number) => {
    const src = questions[idx];
    const copy: Question = {
      ...src,
      id: '',
      order_index: questions.length,
      options: src.options?.map((o) => ({ ...o, id: '', question_id: '', is_correct: o.is_correct })) || [],
    };
    setQuestions((prev) => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
  };

  const deleteQuestion = (idx: number) => {
    if (questions.length <= 1) { toast.error('Quiz must have at least one question'); return; }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, q: Question) => {
    setQuestions((prev) => prev.map((p, i) => (i === idx ? q : p)));
  };

  const addAssignment = (target_type: 'class' | 'section' | 'student', target_id: string) => {
    if (!id || !target_id) return;
    const exists = assignments.some(
      (a) => a.target_type === target_type && a.target_id === target_id
    );
    if (exists) return;
    setAssignments((prev) => [...prev, { id: '', quiz_id: id, target_type, target_id, created_at: '' }]);
  };

  const isClassAssigned = (classId: string) =>
    assignments.some((a) => a.target_type === 'class' && a.target_id === classId);

  const isSectionAssigned = (sectionId: string) => {
    const section = classes.flatMap((c) => c.sections).find((s) => s.id === sectionId);
    if (!section) return false;
    return (
      isClassAssigned(section.class_id) ||
      assignments.some((a) => a.target_type === 'section' && a.target_id === sectionId)
    );
  };

  const removeAssignment = (idx: number) => {
    setAssignments((prev) => prev.filter((_, i) => i !== idx));
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>;
  if (!quiz) return <div className="p-8 text-center text-muted-foreground">Quiz not found</div>;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(ROUTES.ADMIN.QUIZ)}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">{quiz.title || 'Untitled Quiz'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] uppercase">{quiz.status}</Badge>
              <span className="text-xs text-muted-foreground">{questions.length} questions</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => id && navigate(ROUTES.ADMIN.QUIZ_PREVIEW(id))}><Eye className="w-4 h-4 mr-1.5" /> Preview</Button>
          <Button variant="outline" size="sm" onClick={() => id && navigate(ROUTES.ADMIN.QUIZ_IMPORT(id))}><Upload className="w-4 h-4 mr-1.5" /> Import</Button>
          <Button variant="outline" size="sm" onClick={() => id && navigate(ROUTES.ADMIN.QUIZ_ANALYTICS(id))}><BarChart3 className="w-4 h-4 mr-1.5" /> Analytics</Button>
          <Button size="sm" onClick={handleSaveQuestions} disabled={saving}><Save className="w-4 h-4 mr-1.5" /> Save</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="questions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Question Builder</h2>
              <Button size="sm" onClick={addQuestion}><Plus className="w-4 h-4 mr-1.5" /> Add Question</Button>
            </div>
            <Reorder.Group axis="y" values={questions} onReorder={setQuestions} className="space-y-4">
              {questions.map((q, idx) => (
                <Reorder.Item key={q.id || `new-${idx}`} value={q}>
                  <QuestionForm
                    question={q}
                    index={idx}
                    onChange={(updated) => updateQuestion(idx, updated)}
                    onDelete={() => deleteQuestion(idx)}
                    onDuplicate={() => duplicateQuestion(idx)}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="border border-border/80">
              <CardHeader><CardTitle className="text-base">Quiz Settings</CardTitle></CardHeader>
              <CardContent>
                <QuizSettingsForm quiz={quiz} onChange={setQuiz} />
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button onClick={handleSaveQuiz} disabled={saving}><Save className="w-4 h-4 mr-1.5" /> Save Settings</Button>
            </div>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <Card className="border border-border/80">
              <CardHeader><CardTitle className="text-base">Assign to Students</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Class</label>
                    <Select onValueChange={(v) => addAssignment('class', v)}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id} disabled={isClassAssigned(c.id)}>
                            {c.name}
                            {isClassAssigned(c.id) && ' (assigned)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Section</label>
                    <Select onValueChange={(v) => addAssignment('section', v)}>
                      <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                      <SelectContent>
                        {classes.flatMap((c) =>
                          c.sections.map((s) => ({ ...s, className: c.name }))
                        ).map((s) => (
                          <SelectItem key={s.id} value={s.id} disabled={isSectionAssigned(s.id)}>
                            {s.className} - {s.name}
                            {isSectionAssigned(s.id) && (
                              isClassAssigned(s.class_id) ? ' (covered by class)' : ' (assigned)'
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Student</label>
                    <Select onValueChange={(v) => addAssignment('student', v)}>
                      <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name} ({s.class} {s.section})</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted"><tr><th className="text-left px-3 py-2">Target</th><th className="text-left px-3 py-2">Type</th><th className="w-16"></th></tr></thead>
                    <tbody>
                      {assignments.map((a, idx) => {
                        let name = a.target_id;
                        if (a.target_type === 'class') name = classes.find((c) => c.id === a.target_id)?.name || a.target_id;
                        if (a.target_type === 'section') name = classes.flatMap((c) => (c.sections || []).map((s: any) => ({ id: s.id, name: `${c.name} - ${s.name}` }))).find((s) => s.id === a.target_id)?.name || a.target_id;
                        if (a.target_type === 'student') name = students.find((s) => s.id === a.target_id)?.name || a.target_id;
                        return (
                          <tr key={idx} className="border-t"><td className="px-3 py-2">{name}</td><td className="px-3 py-2 capitalize">{a.target_type}</td><td className="px-3 py-2"><Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeAssignment(idx)}>Remove</Button></td></tr>
                        );
                      })}
                      {assignments.length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">No assignments. This quiz will not be visible to students.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveAssignments} disabled={saving}><Users className="w-4 h-4 mr-1.5" /> Save Assignments</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
