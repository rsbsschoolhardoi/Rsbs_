import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Search, MoreHorizontal, Copy, Trash2, Eye, BarChart3, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { QuizCard } from '@/components/quiz/QuizCard';
import { QuizStatusBadge } from '@/components/quiz/QuizStatusBadge';
import { api } from '@/db/api';
import { ROUTES } from '@/constants/routes';
import { toast } from 'sonner';
import type { Quiz } from '@/types';
import { cn } from '@/lib/utils';

export default function QuizList() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await api.getQuizzes();
    if (error) toast.error('Failed to load quizzes');
    setQuizzes(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = quizzes.filter((q) => q.title.toLowerCase().includes(search.toLowerCase()) || (q.subject_name || '').toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quiz?')) return;
    const { error } = await api.deleteQuiz(id);
    if (error) {
      console.error('Failed to delete quiz:', error);
      toast.error(`Failed to delete quiz: ${error.message || 'Unknown error'}`);
      return;
    }
    toast.success('Quiz deleted');
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
  };

  const handleDuplicate = async (q: Quiz) => {
    const { title, description, subject_id, chapter, topic, category, academic_session, difficulty, cover_url, icon, answer_mode, timer_seconds, passing_percentage, max_attempts, negative_marks, marks_per_question, random_questions, random_options, allow_navigation, show_explanations, allow_retry, show_result_review, study_ai_enabled, show_leaderboard, number_of_questions, appearance, settings } = q;
    const { data, error } = await api.createQuiz({
      title: `${title} (Copy)`,
      description,
      subject_id,
      chapter,
      topic,
      category,
      academic_session,
      difficulty,
      cover_url,
      icon,
      status: 'draft',
      answer_mode,
      timer_seconds,
      passing_percentage,
      max_attempts,
      negative_marks,
      marks_per_question,
      random_questions,
      random_options,
      allow_navigation,
      show_explanations,
      allow_retry,
      show_result_review,
      study_ai_enabled,
      show_leaderboard,
      number_of_questions,
      appearance,
      settings,
    });
    if (error || !data) {
      console.error('Failed to duplicate quiz:', error);
      toast.error(`Failed to duplicate quiz: ${error?.message || 'Unknown error'}`);
      return;
    }
    const { error: dupError } = await api.duplicateQuizQuestions(q.id, data.id);
    if (dupError) {
      console.error('Failed to duplicate quiz questions:', dupError);
      toast.error(`Quiz copied but questions failed to duplicate: ${dupError.message || 'Unknown error'}`);
    }
    toast.success('Quiz duplicated');
    navigate(ROUTES.ADMIN.QUIZ_EDIT(data.id));
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-sm text-muted-foreground">Create, manage and assign quizzes to students</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(ROUTES.ADMIN.QUIZ_CREATE)}>
            <Plus className="w-4 h-4 mr-2" /> Create Quiz
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quizzes..." className="pl-10" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (<Card key={i} className="h-40 animate-pulse bg-muted" />))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((q) => (
            <div key={q.id} className="relative group">
              <QuizCard
                quiz={q}
                role="admin"
                onClick={() => navigate(ROUTES.ADMIN.QUIZ_EDIT(q.id))}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(ROUTES.ADMIN.QUIZ_EDIT(q.id))}><Eye className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(ROUTES.ADMIN.QUIZ_PREVIEW(q.id))}><Eye className="w-4 h-4 mr-2" /> Preview</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(ROUTES.ADMIN.QUIZ_IMPORT(q.id))}><Upload className="w-4 h-4 mr-2" /> Import Questions</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(ROUTES.ADMIN.QUIZ_ANALYTICS(q.id))}><BarChart3 className="w-4 h-4 mr-2" /> Analytics</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(q)}><Copy className="w-4 h-4 mr-2" /> Duplicate</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(q.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              No quizzes found. <Button variant="link" onClick={() => navigate(ROUTES.ADMIN.QUIZ_CREATE)}>Create one</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
