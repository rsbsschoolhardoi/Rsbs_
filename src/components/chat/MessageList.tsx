import React, { useEffect, useRef, useState } from 'react';
import { Message } from '@/types/chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Bot, Loader2, Volume2, FileText, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSpeak = (message: Message) => {
    if ('speechSynthesis' in window) {
      if (speakingId === message.id) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message.content);
      
      utterance.onstart = () => setSpeakingId(message.id);
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = (e) => {
        console.error('Speech synthesis error', e);
        setSpeakingId(null);
        toast.error('Voice synthesis failed.');
      };

      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Text-to-speech is not supported in this browser.');
    }
  };

  return (
    <ScrollArea className="flex-1 p-4 h-[calc(100vh-140px)]">
      <div className="space-y-6 max-w-4xl mx-auto py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
              message.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <Avatar className="h-9 w-9 border-2 border-background shadow-sm shrink-0">
              {message.role === 'user' ? (
                <>
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground shadow-inner"><User className="h-5 w-5" /></AvatarFallback>
                </>
              ) : (
                <>
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-secondary text-secondary-foreground shadow-inner"><Bot className="h-5 w-5" /></AvatarFallback>
                </>
              )}
            </Avatar>
            <div
              className={cn(
                "flex flex-col gap-2 max-w-[85%]",
                message.role === 'user' ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-5 py-3.5 text-sm shadow-sm relative group transition-all duration-200",
                  message.role === 'user' 
                    ? "bg-primary text-primary-foreground rounded-tr-none ring-1 ring-primary/20" 
                    : "bg-background text-foreground rounded-tl-none border border-border/60 hover:border-border ring-1 ring-black/[0.02] dark:ring-white/[0.02]"
                )}
              >
                {/* Message Content */}
                <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {message.attachments.map((att, idx) => (
                      <div key={idx} className="rounded-lg overflow-hidden border bg-black/5 dark:bg-white/5 p-2 flex items-center gap-2 group/att transition-colors">
                        {att.type === 'image' ? (
                          <div className="relative h-12 w-12 shrink-0 rounded overflow-hidden cursor-pointer" onClick={() => window.open(att.url, '_blank')}>
                            <img src={att.url} alt="Attached" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 flex items-center justify-center transition-opacity">
                              <ExternalLink className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="h-10 w-10 shrink-0 bg-background rounded flex items-center justify-center border">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[10px] font-medium truncate uppercase opacity-60">{att.type}</span>
                          <span className="text-[11px] truncate font-bold leading-tight">{att.name || 'Untitled'}</span>
                        </div>
                        <a href={att.url} download={att.name || 'file'} className="p-1.5 hover:bg-background rounded-full transition-colors border border-transparent hover:border-border">
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Speaker Button for AI */}
                {message.role === 'assistant' && message.content && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "absolute -right-10 top-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                      speakingId === message.id && "opacity-100 text-primary animate-pulse"
                    )}
                    onClick={() => handleSpeak(message)}
                    title="Read Aloud"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}

                {/* Timestamp */}
                <div className={cn(
                  "text-[9px] mt-2 opacity-50 font-mono tracking-tighter",
                  message.role === 'user' ? "text-right" : "text-left"
                )}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-4 flex-row animate-in fade-in duration-300">
            <Avatar className="h-9 w-9 border-2 border-background shadow-sm shrink-0">
              <AvatarFallback className="bg-secondary text-secondary-foreground animate-pulse shadow-inner"><Bot className="h-5 w-5" /></AvatarFallback>
            </Avatar>
            <div className="bg-background text-foreground rounded-2xl rounded-tl-none px-5 py-3.5 border border-border/60 flex items-center gap-3 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.02]">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce"></span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} className="h-4" />
      </div>
    </ScrollArea>
  );
};

export default MessageList;
