import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import type { ApiConfig } from '@/types';
import { Check, ChevronDown } from 'lucide-react';

interface ModelSelectorProps {
  configs: ApiConfig[];
  selected: ApiConfig | null;
  onSelect: (c: ApiConfig) => void;
}

export function ModelSelector({ configs, selected, onSelect }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!configs.length) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all',
          'border border-border/60 hover:border-primary/50 hover:bg-muted',
          'text-muted-foreground hover:text-foreground'
        )}
      >
        <span className="max-w-[100px] truncate">{selected?.name || 'Select model'}</span>
        <ChevronDown className={cn('w-3 h-3 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full mb-1.5 left-0 z-50 min-w-[180px] rounded-xl border border-border/50 shadow-lg overflow-hidden bg-background/95 backdrop-blur-xl"
          >
            <div className="py-1">
              {configs.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onSelect(c); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors',
                    c.id === selected?.id
                      ? 'text-primary bg-primary/8 font-semibold'
                      : 'text-foreground hover:bg-muted/60'
                  )}
                >
                  {c.id === selected?.id ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 shrink-0" />}
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
