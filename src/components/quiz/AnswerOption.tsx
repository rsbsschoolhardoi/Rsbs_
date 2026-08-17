import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnswerOptionProps {
  label: string;
  text: string;
  selected?: boolean;
  isCorrect?: boolean | null;
  isWrong?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function AnswerOption({ label, text, selected, isCorrect, isWrong, disabled, onClick }: AnswerOptionProps) {
  const showCorrect = isCorrect === true;
  const showWrong = isWrong === true;

  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={!disabled ? onClick : undefined}
      className={cn(
        'w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
        'hover:bg-muted/50',
        selected && 'border-primary bg-primary/5 ring-1 ring-primary/30',
        showCorrect && 'border-success bg-success/10 ring-1 ring-success/30',
        showWrong && 'border-destructive bg-destructive/10 ring-1 ring-destructive/30',
        disabled && 'cursor-default opacity-90'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border shrink-0',
        selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border',
        showCorrect && 'bg-success text-success-foreground border-success',
        showWrong && 'bg-destructive text-white border-destructive'
      )}>
        {showCorrect ? <Check className="w-4 h-4" /> : showWrong ? <X className="w-4 h-4" /> : label}
      </div>
      <span className="text-sm md:text-base font-medium leading-snug">{text}</span>
    </motion.button>
  );
}
