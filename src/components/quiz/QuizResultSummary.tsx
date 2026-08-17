import { motion } from 'motion/react';
import { Trophy, Clock, CheckCircle, XCircle, HelpCircle, Percent, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Quiz, QuizAttempt } from '@/types';

interface QuizResultSummaryProps {
  quiz: Quiz;
  attempt: QuizAttempt;
  onReview?: () => void;
  onRetry?: () => void;
}

export function QuizResultSummary({ quiz, attempt, onReview, onRetry }: QuizResultSummaryProps) {
  const passed = attempt.percentage >= quiz.passing_percentage;
  const total = attempt.correct_count + attempt.incorrect_count + attempt.unanswered_count;
  const accuracy = total > 0 ? Math.round((attempt.correct_count / total) * 100) : 0;

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  const stats = [
    { label: 'Score', value: `${attempt.percentage}%`, icon: Percent },
    { label: 'Correct', value: attempt.correct_count, icon: CheckCircle, color: 'text-success' },
    { label: 'Incorrect', value: attempt.incorrect_count, icon: XCircle, color: 'text-destructive' },
    { label: 'Unanswered', value: attempt.unanswered_count, icon: HelpCircle },
    { label: 'Total', value: total, icon: Target },
    { label: 'Time', value: formatTime(attempt.time_spent_seconds), icon: Clock },
    { label: 'Accuracy', value: `${accuracy}%`, icon: TrendingUp },
    { label: 'Attempt', value: attempt.attempt_number, icon: Trophy },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="space-y-6"
    >
      <Card className="overflow-hidden border border-border/80">
        <div className={cn('h-2 w-full', passed ? 'bg-success' : 'bg-warning')} />
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Trophy className={cn('w-8 h-8', passed ? 'text-success' : 'text-primary')} />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold">{passed ? 'Congratulations!' : 'Keep Going!'}</CardTitle>
          <p className="text-muted-foreground">{passed ? 'You passed the quiz.' : 'You did not reach the passing mark.'}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-3">
            <Badge className={cn('text-base px-4 py-1', passed ? 'bg-success hover:bg-success' : 'bg-warning hover:bg-warning')}>{passed ? 'PASS' : 'FAIL'}</Badge>
            <span className="text-3xl font-bold">{attempt.percentage}%</span>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            Marks {attempt.score} / {attempt.total_marks} • Passing {quiz.passing_percentage}%
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border p-3 flex flex-col items-center text-center">
                <s.icon className={cn('w-5 h-5 mb-1', s.color || 'text-primary')} />
                <div className="text-lg font-bold">{s.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {onReview && (
              <Button variant="outline" onClick={onReview}>Review Answers</Button>
            )}
            {onRetry && (
              <Button onClick={onRetry}>Try Again</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
