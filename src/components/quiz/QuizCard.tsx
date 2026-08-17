import { motion } from 'motion/react';
import { BookOpen, Clock, Users, BarChart2, Calendar, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Quiz, QuizAttempt } from '@/types';

interface QuizCardProps {
  quiz: Quiz;
  role: 'admin' | 'student';
  onClick?: () => void;
  onPrimary?: () => void;
  primaryLabel?: string;
  primaryIcon?: React.ElementType;
  primaryDisabled?: boolean;
  className?: string;
  latestAttempt?: QuizAttempt | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  preview: 'bg-primary/10 text-primary',
  published: 'bg-success/10 text-success',
  active: 'bg-success/10 text-success',
  scheduled: 'bg-warning/10 text-warning',
  completed: 'bg-info/10 text-info',
  archived: 'bg-muted text-muted-foreground',
};

function formatDuration(seconds?: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  return `${m}m`;
}

export function QuizCard({
  quiz,
  role,
  onClick,
  onPrimary,
  primaryLabel,
  primaryIcon: PrimaryIcon = Play,
  primaryDisabled,
  className,
  latestAttempt,
}: QuizCardProps) {
  const statusClass = STATUS_COLORS[quiz.status] || STATUS_COLORS.draft;
  const duration = formatDuration(quiz.timer_seconds);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      className={cn('h-full', className)}
    >
      <Card
        className={cn(
          'h-full flex flex-col cursor-pointer overflow-hidden border border-border bg-card shadow-card',
          onClick && 'hover:border-primary/30 hover:shadow-hover'
        )}
        onClick={onClick}
      >
        <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className={cn('text-[10px] font-semibold uppercase tracking-wider', statusClass)}>
                {quiz.status}
              </Badge>
              {quiz.difficulty && (
                <Badge variant="outline" className="text-[10px] capitalize">
                  {quiz.difficulty}
                </Badge>
              )}
            </div>
            <h3 className="text-base font-semibold leading-tight text-foreground truncate">{quiz.title}</h3>
            {quiz.subject_name && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {quiz.subject_name} {quiz.chapter ? `• ${quiz.chapter}` : ''} {quiz.topic ? `• ${quiz.topic}` : ''}
              </p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col pt-0">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
            {quiz.question_count != null && quiz.question_count > 0 && (
              <span className="flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5" />
                {quiz.question_count} Qs
              </span>
            )}
            {quiz.number_of_questions != null && quiz.number_of_questions > 0 && quiz.question_count == null && (
              <span className="flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5" />
                {quiz.number_of_questions} Qs
              </span>
            )}
            {duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {duration}
              </span>
            )}
            {quiz.max_attempts > 1 && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {quiz.max_attempts} attempts
              </span>
            )}
            {quiz.start_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(quiz.start_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {role === 'student' && latestAttempt && (
            <div className="mt-3 p-2 rounded-lg bg-muted/50 text-xs">
              {latestAttempt.status === 'completed' ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className={cn('w-4 h-4', latestAttempt.percentage >= quiz.passing_percentage ? 'text-success' : 'text-warning')} />
                  <span>
                    Attempt {latestAttempt.attempt_number} — {latestAttempt.percentage}% {latestAttempt.percentage >= quiz.passing_percentage ? 'Pass' : 'Fail'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <span>In Progress</span>
                </div>
              )}
            </div>
          )}

          {onPrimary && (
            <div className="mt-auto pt-4">
              <Button
                size="sm"
                className="w-full"
                onClick={(e) => { e.stopPropagation(); onPrimary(); }}
                disabled={primaryDisabled}
              >
                <PrimaryIcon className="w-4 h-4 mr-1.5" />
                {primaryLabel}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
