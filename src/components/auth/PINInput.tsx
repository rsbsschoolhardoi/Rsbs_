/**
 * PINInput — 4 separate PIN digit boxes
 * ────────────────────────────────────────
 * Features:
 *   • Auto-focus first box on mount
 *   • Auto-advance to next box on digit entry
 *   • Backspace clears current then moves to previous
 *   • Full paste support (4-digit numeric string)
 *   • Always numeric keyboard (inputMode="numeric")
 *   • Masked display (shows •)
 *   • Smooth scale/border animation on focus/fill
 *   • Min 16px font-size to prevent browser zoom on mobile
 */
import React, { useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface PINInputProps {
  value: string;           // always 0-4 chars, numeric
  onChange: (val: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

export const PINInput: React.FC<PINInputProps> = ({
  value,
  onChange,
  disabled = false,
  hasError = false,
  autoFocus = false,
}) => {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto-focus first box on mount
  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => refs[0].current?.focus(), 80);
    }
  }, [autoFocus]);

  // Focus the box matching the current fill length
  const focusIndex = (idx: number) => {
    const clamped = Math.max(0, Math.min(3, idx));
    refs[clamped].current?.focus();
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[idx]) {
        // Clear this digit
        const next = value.slice(0, idx) + value.slice(idx + 1);
        onChange(next.padEnd(0, '').slice(0, 4));
        focusIndex(idx);
      } else if (idx > 0) {
        // Move back and clear previous
        const next = value.slice(0, idx - 1) + value.slice(idx);
        onChange(next.slice(0, 4));
        focusIndex(idx - 1);
      }
      return;
    }

    if (e.key === 'ArrowLeft' && idx > 0) { e.preventDefault(); focusIndex(idx - 1); return; }
    if (e.key === 'ArrowRight' && idx < 3) { e.preventDefault(); focusIndex(idx + 1); return; }
  };

  const handleInput = (idx: number, inputVal: string) => {
    if (disabled) return;
    const digit = inputVal.replace(/[^0-9]/g, '').slice(-1);
    if (!digit) return;

    const chars = (value + '    ').slice(0, 4).split('');
    chars[idx] = digit;
    const next = chars.join('').replace(/ /g, '');
    onChange(next.slice(0, 4));

    if (idx < 3) focusIndex(idx + 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const raw = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
    if (!raw) return;
    onChange(raw);
    focusIndex(Math.min(raw.length, 3));
  };

  return (
    <div
      className="flex items-center justify-center gap-3"
      role="group"
      aria-label="PIN input"
    >
      {[0, 1, 2, 3].map(i => {
        const filled = i < value.length;
        const focused = i === value.length || (value.length === 4 && i === 3);
        return (
          <motion.div
            key={i}
            animate={{
              scale: focused ? 1.06 : 1,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="relative"
          >
            {/* Visible box — purely decorative overlay */}
            <div
              className={cn(
                'w-14 h-14 rounded-2xl border-2 flex items-center justify-center pointer-events-none select-none transition-all duration-150',
                hasError
                  ? 'border-destructive bg-destructive/5'
                  : filled
                    ? 'border-primary bg-primary/5'
                    : focused
                      ? 'border-primary/60 bg-muted/40'
                      : 'border-border/60 bg-muted/30',
              )}
            >
              {filled ? (
                <span className="w-3 h-3 rounded-full bg-foreground block" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-border/40 block" />
              )}
            </div>

            {/* Real input — invisible but interactive */}
            <input
              ref={refs[i]}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value=""
              disabled={disabled}
              onChange={e => handleInput(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={() => focusIndex(i)}
              aria-label={`PIN digit ${i + 1}`}
              autoComplete="one-time-code"
              className={cn(
                // Positioned over the visual box; opacity 0 so it's invisible
                'absolute inset-0 w-full h-full opacity-0 cursor-text',
                // CRITICAL: 16px minimum to prevent mobile browser zoom
                'text-[16px]',
                disabled && 'pointer-events-none',
              )}
            />
          </motion.div>
        );
      })}
    </div>
  );
};
