import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QuizResultSummary } from '@/components/quiz/QuizResultSummary';
import { QuizAiBox } from '@/components/quiz/QuizAiBox';
import { api } from '@/db/api';
import { ROUTES } from '@/constants/routes';
import { toast } from 'sonner';
import type { Quiz, QuizResultReview, Question } from '@/types';
import { cn } from '@/lib/utils';

export default function QuizResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<QuizResultReview | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await api.getQuizResultReview(id);
      if (error || !data) { toast.error('Failed to load result'); setLoading(false); return; }
      setReview(data);
      const { data: quizData } = await api.getQuizById(data.quiz_id);
      setQuiz(quizData as Quiz);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-full"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>;
  if (!review || !quiz) return <div className="p-8 text-center">Result not found.</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <Button variant="outline" onClick={() => navigate(ROUTES.STUDENT.QUIZ)} className="w-fit"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Quizzes</Button>
      <QuizResultSummary
        quiz={quiz}
        attempt={review.attempt}
        onReview={() => setShowReview(true)}
        onRetry={quiz.allow_retry ? () => navigate(ROUTES.STUDENT.QUIZ_PLAYER(quiz.id)) : undefined}
      />

      {showReview && quiz.show_result_review && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Question Review</h2>
          {review.questions.map((q, idx) => {
            const correct = q.selected_option_id === q.correct_option_id;
            return (
              <Card key={idx} className={cn('border', correct ? 'border-success/30' : 'border-destructive/30')}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Question {idx + 1}</span>
                    <span className={cn('text-sm font-medium', correct ? 'text-success' : 'text-destructive')}>{correct ? 'Correct' : 'Incorrect'}</span>
                  </div>
                  <p className="text-sm font-medium">{q.question_text}</p>
                  <div className="space-y-1">
                    {q.options.map((o, i) => (
                      <div key={i} className={cn(
                        'text-sm p-2 rounded border',
                        o.id === q.correct_option_id && 'bg-success/10 border-success text-success',
                        o.id === q.selected_option_id && o.id !== q.correct_option_id && 'bg-destructive/10 border-destructive text-destructive',
                        o.id !== q.correct_option_id && o.id !== q.selected_option_id && 'bg-muted/30'
                      )}>
                        {String.fromCharCode(65 + i)}. {o.option_text} {o.id === q.correct_option_id && '✓'} {o.id === q.selected_option_id && o.id !== q.correct_option_id && '✗'}
                      </div>
                    ))}
                  </div>
                  {q.explanation && <p className="text-xs text-muted-foreground">{q.explanation}</p>}
                  {quiz.study_ai_enabled && (
                    <QuizAiBox
                      quiz={quiz}
                      question={q as any}
                      attemptId={review.attempt.id}
                      answerMode={quiz.answer_mode}
                      selectedOptionId={q.selected_option_id}
                      correctOptionId={q.correct_option_id}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
