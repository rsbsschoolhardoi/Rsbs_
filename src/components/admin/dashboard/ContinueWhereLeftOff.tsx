import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { ResumeContext } from './types';

interface ContinueWhereLeftOffProps {
  context?: ResumeContext | null;
}

export default function ContinueWhereLeftOff({ context }: ContinueWhereLeftOffProps) {
  if (!context) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-card p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
        <Clock className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Continue where you left off</p>
        <h4 className="text-sm font-semibold text-foreground mt-0.5">{context.title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{context.subtitle}</p>
      </div>
      <Link
        to={context.link}
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
      >
        Resume <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
