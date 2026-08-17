import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { QuizStatus } from '@/types';

const STATUS_STYLES: Record<QuizStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  preview: 'bg-primary/10 text-primary',
  published: 'bg-green-500/10 text-green-600',
  active: 'bg-green-500/10 text-green-600',
  scheduled: 'bg-amber-500/10 text-amber-600',
  completed: 'bg-blue-500/10 text-blue-600',
  archived: 'bg-slate-500/10 text-slate-600',
};

interface QuizStatusBadgeProps {
  status: QuizStatus;
  className?: string;
}

export function QuizStatusBadge({ status, className }: QuizStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn('text-[10px] font-semibold uppercase tracking-wider', STATUS_STYLES[status], className)}>
      {status}
    </Badge>
  );
}
