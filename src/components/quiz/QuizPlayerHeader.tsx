import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface QuizPlayerHeaderProps {
  quizTitle: string;
  currentIndex: number;
  totalQuestions: number;
  timerSeconds?: number | null;
  className?: string;
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function QuizPlayerHeader({
  quizTitle,
  currentIndex,
  totalQuestions,
  timerSeconds,
  className,
}: QuizPlayerHeaderProps) {
  const [remaining, setRemaining] = useState(timerSeconds || 0);

  useEffect(() => {
    setRemaining(timerSeconds || 0);
  }, [timerSeconds]);

  useEffect(() => {
    if (!remaining || remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(interval); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  return (
    <header className={cn('flex flex-col gap-3 pb-4', className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-semibold truncate">{quizTitle}</h1>
          <p className="text-sm text-muted-foreground">Question {currentIndex + 1} of {totalQuestions}</p>
        </div>
        {timerSeconds && timerSeconds > 0 && (
          <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium shrink-0', remaining <= 30 && 'text-destructive border-destructive bg-destructive/10')}>
            <Clock className="w-4 h-4" />
            {formatTime(remaining)}
          </div>
        )}
      </div>
      <Progress value={progress} className="h-2 bg-muted" />
    </header>
  );
}
