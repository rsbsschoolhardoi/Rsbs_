import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuizAnalyticsDashboard } from '@/components/quiz/QuizAnalyticsDashboard';
import { api } from '@/db/api';
import { ROUTES } from '@/constants/routes';
import { toast } from 'sonner';
import type { QuizAnalytics as QuizAnalyticsType, QuestionWiseAnalytics, QuizAttempt, Quiz } from '@/types';

export default function QuizAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [analytics, setAnalytics] = useState<QuizAnalyticsType | null>(null);
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionWiseAnalytics[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [quizRes, aRes, qRes, attemptsRes] = await Promise.all([
        api.getQuizById(id),
        api.getQuizAnalytics(id),
        api.getQuestionWiseAnalytics(id),
        api.getQuizAttempts(id),
      ]);
      if (quizRes.data) setQuiz(quizRes.data as Quiz);
      setAnalytics(aRes.data);
      setQuestionAnalytics(qRes.data || []);
      setAttempts(attemptsRes.data || []);
      setLoading(false);
    };
    load();
  }, [id]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => id && navigate(ROUTES.ADMIN.QUIZ_EDIT(id))}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Quiz Analytics</h1>
            <p className="text-sm text-muted-foreground">{quiz?.title || 'Quiz'}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => id && navigate(ROUTES.ADMIN.QUIZ_EDIT(id))}><BarChart3 className="w-4 h-4 mr-1.5" /> Back to Quiz</Button>
      </div>

      {loading || !analytics ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : (
        <QuizAnalyticsDashboard analytics={analytics} questionAnalytics={questionAnalytics} attempts={attempts} />
      )}
    </div>
  );
}
