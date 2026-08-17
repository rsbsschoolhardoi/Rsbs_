import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuizSettingsForm } from '@/components/quiz/QuizSettingsForm';
import { api } from '@/db/api';
import { ROUTES } from '@/constants/routes';
import { toast } from 'sonner';
import type { Quiz } from '@/types';

const defaultQuiz: Partial<Quiz> = {
  title: '',
  description: '',
  status: 'draft',
  difficulty: 'medium',
  answer_mode: 'instant',
  passing_percentage: 0,
  max_attempts: 1,
  marks_per_question: 1,
  negative_marks: 0,
  random_questions: false,
  random_options: false,
  allow_navigation: true,
  show_explanations: true,
  allow_retry: false,
  show_result_review: true,
  study_ai_enabled: true,
  show_leaderboard: false,
};

export default function QuizCreate() {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Partial<Quiz>>(defaultQuiz);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!quiz.title?.trim()) { toast.error('Please enter a quiz title'); return; }
    setSaving(true);
    try {
      const { data, error } = await api.createQuiz(quiz);
      if (error || !data) {
        console.error('Failed to create quiz:', error);
        toast.error(`Failed to create quiz: ${error?.message || 'Unknown error'}`);
        setSaving(false);
        return;
      }
      toast.success('Quiz created');
      navigate(ROUTES.ADMIN.QUIZ_EDIT(data.id));
    } catch (err) {
      console.error('Failed to create quiz (exception):', err);
      toast.error(`Failed to create quiz: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Quiz</h1>
        <p className="text-sm text-muted-foreground">Start with the basics. You can add questions next.</p>
      </div>
      <Card className="border border-border/80">
        <CardHeader>
          <CardTitle className="text-base">Quiz Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <QuizSettingsForm quiz={quiz} onChange={setQuiz} />
        </CardContent>
      </Card>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(ROUTES.ADMIN.QUIZ)}>Cancel</Button>
        <Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Quiz'}</Button>
      </div>
    </div>
  );
}
