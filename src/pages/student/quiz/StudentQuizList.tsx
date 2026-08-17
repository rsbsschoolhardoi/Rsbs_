import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuizCard } from '@/components/quiz/QuizCard';
import { api } from '@/db/api';
import { ROUTES } from '@/constants/routes';
import { toast } from 'sonner';
import type { Quiz, QuizAttempt } from '@/types';
import { RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function StudentQuizList() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: apiError } = await api.getQuizzes({ forStudent: true });
      if (apiError) throw new Error(apiError.message || 'Failed to load quizzes');
      setQuizzes(data || []);
    } catch (err: any) {
      console.error('Quiz load failed:', err);
      setError('Unable to load quizzes. Please try again.');
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Defensive timeout so the spinner never stays forever
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Quizzes took too long to load. Please try again.');
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading]);

  const now = new Date();
  const available = quizzes.filter((q) => {
    if (q.status !== 'published' && q.status !== 'active') return false;
    if (q.start_at && new Date(q.start_at) > now) return false;
    if (q.end_at && new Date(q.end_at) < now) return false;
    return true;
  });
  const upcoming = quizzes.filter((q) => q.status === 'scheduled' || (q.start_at && new Date(q.start_at) > now));
  const inProgress = quizzes.filter((q) => q.my_attempts?.some((a) => a.status === 'in_progress'));
  const completed = quizzes.filter((q) => q.my_attempts?.some((a) => a.status === 'completed'));

  const handlePrimary = async (quiz: Quiz) => {
    const attempts = quiz.my_attempts || [];
    const inProg = attempts.find((a) => a.status === 'in_progress');
    if (inProg) {
      navigate(ROUTES.STUDENT.QUIZ_PLAYER(quiz.id));
      return;
    }
    const completed = attempts.filter((a) => a.status === 'completed');
    if (completed.length && !quiz.allow_retry) {
      navigate(ROUTES.STUDENT.QUIZ_RESULT(completed[0].id));
      return;
    }
    navigate(ROUTES.STUDENT.QUIZ_PLAYER(quiz.id));
  };

  const renderTab = (list: Quiz[], label: string, empty: string) => (
    <TabsContent value={label} className="space-y-4">
      {list.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">{empty}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((q) => {
            const attempts = q.my_attempts || [];
            const inProg = attempts.find((a) => a.status === 'in_progress');
            const completed = attempts.find((a) => a.status === 'completed');
            const label = inProg ? 'Continue' : completed ? 'View Result' : 'Start Quiz';
            return (
              <QuizCard
                key={q.id}
                quiz={q}
                role="student"
                onPrimary={() => handlePrimary(q)}
                primaryLabel={label}
                latestAttempt={inProg || completed || null}
              />
            );
          })}
        </div>
      )}
    </TabsContent>
  );

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">My Quizzes</h1>
        <p className="text-sm text-muted-foreground">Available, upcoming, in-progress and completed quizzes</p>
      </div>
      {error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <RefreshCw className="w-5 h-5 text-muted-foreground" />
          </div>
          <h2 className="font-heading text-lg font-bold text-foreground mb-1">Couldn’t load quizzes</h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">{error}</p>
          <Button onClick={load} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Try again
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      ) : (
        <Tabs defaultValue="available">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          {renderTab(available, 'available', 'No quizzes available right now.')}
          {renderTab(upcoming, 'upcoming', 'No upcoming quizzes.')}
          {renderTab(inProgress, 'in-progress', 'No quizzes in progress.')}
          {renderTab(completed, 'completed', 'No completed quizzes.')}
        </Tabs>
      )}
    </div>
  );
}
