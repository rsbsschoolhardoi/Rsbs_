import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Menu, Plus, Search, Sun, Moon, ChevronLeft } from 'lucide-react';

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  usageText?: string;
  onOpenHistory: () => void;
  onNewChat: () => void;
  onToggleSearch: () => void;
  onToggleTheme: () => void;
  onBack?: () => void;
  isDark?: boolean;
}

export function ChatHeader({
  title = 'Study AI',
  subtitle,
  usageText,
  onOpenHistory,
  onNewChat,
  onToggleSearch,
  onToggleTheme,
  onBack,
  isDark,
}: ChatHeaderProps) {
  return (
    <div
      className={cn(
        'flex-none flex items-center justify-between px-3 md:px-4 py-2.5 border-b border-border/40 z-20',
        'bg-background/95 backdrop-blur-md'
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8 rounded-lg shrink-0 bg-gradient-to-br from-primary/90 to-primary/60 text-primary-foreground hover:from-primary hover:to-primary/70 shadow-sm"
            aria-label="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenHistory}
          className="h-8 w-8 rounded-lg shrink-0"
          aria-label="Open history"
        >
          <Menu className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="font-heading font-semibold text-sm md:text-base leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {usageText && (
          <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] h-6 px-2 mr-1">
            {usageText}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSearch}
          className="h-8 w-8 rounded-lg"
          aria-label="Search in chat"
        >
          <Search className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          className="h-8 w-8 rounded-lg"
          aria-label="New chat"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          className="h-8 w-8 rounded-lg"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
