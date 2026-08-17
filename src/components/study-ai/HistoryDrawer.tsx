import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AiChatSession } from '@/types';
import {
  Plus, MessageSquare, Search, Pin, PinOff, Edit2, Check, X, Trash2, Sparkles,
  Menu,
} from 'lucide-react';

interface HistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: AiChatSession[];
  activeSession: AiChatSession | null;
  onSelect: (session: AiChatSession) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onPinSession: (session: AiChatSession) => void;
  search: string;
  onSearch: (val: string) => void;
  loading?: boolean;
  children?: React.ReactNode; // trigger button when used as Sheet wrapper
  isDark?: boolean;
}

export function HistoryDrawer({
  open,
  onOpenChange,
  sessions,
  activeSession,
  onSelect,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onPinSession,
  search,
  onSearch,
  loading,
  children,
  isDark,
}: HistoryDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const filtered = sessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );
  const pinned = filtered.filter(s => s.is_pinned);
  const recent = filtered.filter(s => !s.is_pinned);

  const startRename = (s: AiChatSession) => {
    setEditingId(s.id);
    setEditingTitle(s.title);
  };

  const commitRename = (id: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) return;
    onRenameSession(id, trimmed);
    setEditingId(null);
  };

  const SessionItem = ({ session }: { session: AiChatSession }) => (
    <div
      className={cn(
        'group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors',
        activeSession?.id === session.id
          ? 'bg-primary/10 text-primary'
          : 'text-foreground hover:bg-muted'
      )}
      onClick={() => {
        onSelect(session);
        onOpenChange(false);
      }}
    >
      {editingId === session.id ? (
        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
          <Input
            value={editingTitle}
            onChange={e => setEditingTitle(e.target.value)}
            className="h-7 text-xs flex-1 min-w-0"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename(session.id);
              if (e.key === 'Escape') setEditingId(null);
            }}
          />
          <button
            className="p-1.5 rounded-md hover:bg-primary/10 text-primary"
            onClick={() => commitRename(session.id)}
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
            onClick={() => setEditingId(null)}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
          <span className="flex-1 text-sm truncate min-w-0">{session.title}</span>
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              onClick={e => {
                e.stopPropagation();
                onPinSession(session);
              }}
              title={session.is_pinned ? 'Unpin' : 'Pin'}
            >
              {session.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
            <button
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              onClick={e => {
                e.stopPropagation();
                startRename(session);
              }}
              title="Rename"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              onClick={e => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {session.is_pinned && !editingId && (
            <Pin className="w-3 h-3 text-primary/60 shrink-0 group-hover:hidden" />
          )}
        </>
      )}
    </div>
  );

  const DrawerContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-semibold text-base">Study AI</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onNewChat}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* New Chat */}
      <div className="p-3 border-b border-border/30">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 rounded-xl h-9 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5"
          onClick={onNewChat}
        >
          <Plus className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">New Chat</span>
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-border/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search chats…"
            className="pl-8 h-9 text-sm rounded-lg bg-muted border-0"
          />
        </div>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {loading ? (
          <div className="space-y-2 p-1">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-9 rounded-lg bg-muted/60 animate-pulse" />
              ))}
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="mb-2">
                <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pinned
                </p>
                <div className="space-y-0.5">{pinned.map(s => <SessionItem key={s.id} session={s} />)}</div>
              </div>
            )}
            {recent.length > 0 && (
              <div className="mb-2">
                {pinned.length > 0 && (
                  <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent
                  </p>
                )}
                <div className="space-y-0.5">{recent.map(s => <SessionItem key={s.id} session={s} />)}</div>
              </div>
            )}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-25" />
                <p className="text-sm">{search ? 'No chats found' : 'No chats yet'}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {children && <SheetTrigger asChild>{children}</SheetTrigger>}
      <SheetContent
        side="left"
        className={cn(
          'w-72 p-0 border-r border-border/40',
          isDark ? 'bg-zinc-950' : 'bg-background'
        )}
      >
        {DrawerContent}
      </SheetContent>
    </Sheet>
  );
}
