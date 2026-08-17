import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Sparkles } from 'lucide-react';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  usageText?: string;
  isEditing?: boolean;
  modelSelector?: React.ReactNode;
}

export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  isLoading,
  placeholder = 'Ask Study AI anything…',
  usageText,
  isEditing,
  modelSelector,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  const canSend = !disabled && !isLoading && value.trim().length > 0;

  return (
    <div
      className={cn(
        'flex-none w-full border-t border-border/40 bg-background/95 backdrop-blur-md',
        'shadow-[0_-6px_24px_-6px_rgba(0,0,0,0.06)]',
        'px-3 md:px-4 pt-2.5 pb-4 md:pb-5'
      )}
      style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
    >
      {/* Usage / status indicator */}
      <div className="flex items-center justify-between px-1 mb-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {isEditing ? (
            <span className="text-primary font-medium">Editing message — press Enter to resend</span>
          ) : modelSelector ? (
            modelSelector
          ) : (
            <>
              <Sparkles className="w-3 h-3" />
              <span>Study AI</span>
            </>
          )}
        </div>
        {usageText && <span className="text-[11px] text-muted-foreground">{usageText}</span>}
      </div>

      {/* Input box */}
      <div
        className={cn(
          'flex items-end gap-2 px-3 py-2.5 rounded-2xl border bg-muted/50',
          disabled
            ? 'border-border/30 bg-muted/30'
            : 'border-border/60 focus-within:border-primary/40 focus-within:bg-background'
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Daily limit reached — come back tomorrow' : placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent border-0 p-0 text-[15px] leading-relaxed',
            'placeholder:text-muted-foreground/70 focus:outline-none focus:ring-0',
            'min-h-[22px] max-h-[120px] transition-[height] duration-200'
          )}
          style={{ overflow: 'hidden' }}
        />

        <Button
          type="button"
          size="icon"
          onClick={onSend}
          disabled={!canSend}
          className={cn(
            'h-9 w-9 rounded-full shrink-0 transition-all',
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
