import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface EmptyStateProps {
  onSuggestion: (text: string) => void;
  isDark?: boolean;
}

const SUGGESTIONS = [
  'Explain Newton’s laws',
  'Help me solve 2x + 5 = 15',
  'Write a summary of the solar system',
  'Generate 5 MCQs on photosynthesis',
  'Essay tips for Hindi',
  'NCERT Class 10 Science chapter 1',
];

export function EmptyState({ onSuggestion, isDark }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex-1 flex flex-col items-center justify-center p-4 text-center"
    >
      <div
        className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm',
          'bg-primary/10'
        )}
      >
        <Sparkles className="w-7 h-7 text-primary" />
      </div>
      <h2 className="font-heading text-lg font-semibold mb-1">Hello, I am Study AI</h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-5">
        Ask me anything in Hindi, English, or Hinglish.
      </p>

      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className={cn(
              'px-3.5 py-2 rounded-full text-xs font-medium border transition-colors',
              'border-border/60 bg-muted/50 hover:border-primary/40 hover:bg-primary/5'
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
