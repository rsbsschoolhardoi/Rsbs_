import { Loader2 } from 'lucide-react';

interface MobilePageLoadingProps {
  message?: string;
}

export function MobilePageLoading({ message = 'Loading…' }: MobilePageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] py-12 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
      <p className="text-sm font-medium text-foreground">{message}</p>
    </div>
  );
}
