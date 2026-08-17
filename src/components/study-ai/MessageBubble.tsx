import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AiChatMessage } from '@/types';
import { useLongPress } from '@/hooks/use-long-press';
import { useIsMobile } from '@/hooks/use-mobile';
import MarkdownRenderer from '@/components/chat/MarkdownRenderer';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Copy, Edit2, RefreshCw, Sparkles } from 'lucide-react';

interface MessageBubbleProps {
  msg: AiChatMessage;
  displayContent: string;
  isStreaming?: boolean;
  isHighlighted?: boolean;
  isDark?: boolean;
  canEdit: boolean;
  canRegenerate: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
}

function StreamingCursor() {
  return (
    <motion.span
      className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle rounded-sm"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.45, repeat: Infinity }}
    />
  );
}

export function MessageBubble({
  msg,
  displayContent,
  isStreaming,
  isHighlighted,
  isDark,
  canEdit,
  canRegenerate,
  onCopy,
  onEdit,
  onRegenerate,
}: MessageBubbleProps) {
  const isMobile = useIsMobile();
  const [actionsOpen, setActionsOpen] = useState(false);
  const isUser = msg.role === 'user';

  const showActions = () => setActionsOpen(true);
  const longPress = useLongPress(showActions, 500);

  const handleCopy = () => {
    onCopy();
    setActionsOpen(false);
  };

  const handleEdit = () => {
    onEdit();
    setActionsOpen(false);
  };

  const handleRegenerate = () => {
    onRegenerate();
    setActionsOpen(false);
  };

  const bubble = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div className={cn('flex items-end gap-2 max-w-[88%] md:max-w-[78%]', isUser ? 'flex-row-reverse' : 'flex-row')}>
        {!isUser && (
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <div
            className={cn(
              'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
              isUser
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : isDark
                  ? 'bg-zinc-800/80 text-foreground border-l-2 border-accent rounded-bl-md'
                  : 'bg-muted text-foreground border-l-2 border-accent rounded-bl-md',
              isHighlighted && 'ring-2 ring-yellow-400'
            )}
            {...(isMobile ? longPress : {})}
            onContextMenu={e => {
              if (isMobile) e.preventDefault();
            }}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap break-words">{displayContent}</p>
            ) : isStreaming ? (
              <span className="relative">
                <MarkdownRenderer content={displayContent} />
                <StreamingCursor />
              </span>
            ) : (
              <MarkdownRenderer content={displayContent} />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const actionItems = (
    <>
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-sm rounded-xl hover:bg-muted transition-colors"
        onClick={handleCopy}
      >
        <Copy className="w-4 h-4" />
        Copy
      </button>
      {canEdit && (
        <button
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm rounded-xl hover:bg-muted transition-colors"
          onClick={handleEdit}
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
      )}
      {canRegenerate && (
        <button
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm rounded-xl hover:bg-muted transition-colors"
          onClick={handleRegenerate}
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate
        </button>
      )}
    </>
  );

  return (
    <>
      {isMobile ? (
        <>
          {bubble}
          <Sheet open={actionsOpen} onOpenChange={setActionsOpen}>
            <SheetContent
              side="bottom"
              className={cn(
                'h-auto pb-8 rounded-t-2xl border-t border-border/40',
                isDark ? 'bg-zinc-950' : 'bg-background'
              )}
            >
              <SheetHeader className="text-left pb-2">
                <SheetTitle className="text-sm font-medium text-muted-foreground">
                  Message actions
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 pt-2">{actionItems}</div>
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <ContextMenu>
          <ContextMenuTrigger asChild>{bubble}</ContextMenuTrigger>
          <ContextMenuContent className="w-44">
            <ContextMenuItem onClick={handleCopy} className="gap-2">
              <Copy className="w-3.5 h-3.5" /> Copy
            </ContextMenuItem>
            {canEdit && (
              <ContextMenuItem onClick={handleEdit} className="gap-2">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </ContextMenuItem>
            )}
            {canRegenerate && (
              <ContextMenuItem onClick={handleRegenerate} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>
      )}
    </>
  );
}
