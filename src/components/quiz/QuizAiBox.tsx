import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuizAi } from '@/hooks/useQuizAi';
import MarkdownRenderer from '@/components/chat/MarkdownRenderer';
import type { Quiz, PlayerQuestion, Question } from '@/types';

interface QuizAiBoxProps {
  quiz: Quiz;
  question: PlayerQuestion | Question;
  attemptId: string;
  answerMode: 'instant' | 'confirm' | 'end';
  selectedOptionId?: string | null;
  correctOptionId?: string | null;
}

export function QuizAiBox({ quiz, question, attemptId, answerMode, selectedOptionId, correctOptionId }: QuizAiBoxProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const options = (question as PlayerQuestion).options || (question as Question).options || [];
  const selectedOption = options.find((o: any) => o.option_id === selectedOptionId) || null;
  const correctOption = options.find((o: any) => o.option_id === correctOptionId) || null;
  const isCorrect = selectedOptionId && correctOptionId ? selectedOptionId === correctOptionId : null;

  const { messages, streamingText, isLoading, initialized, loadInteraction, sendMessage } = useQuizAi({
    quiz,
    question: question as Question,
    attemptId,
    answerMode,
    selectedOption: selectedOption ? { ...selectedOption, id: selectedOption.option_id } as any : null,
    correctOption: correctOption ? { ...correctOption, id: correctOption.option_id } as any : null,
    isCorrect,
    explanation: question.explanation || undefined,
  });

  useEffect(() => {
    if (open && !initialized) loadInteraction();
  }, [open, initialized, loadInteraction]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleInitialOpen = () => {
    setOpen(true);
    if (!initialized) {
      const initial = selectedOption
        ? (isCorrect === true
          ? 'Explain why my answer is correct.'
          : 'Explain why my answer is wrong.')
        : 'Explain this question.';
      sendMessage(initial);
    }
  };

  const handleFollowUp = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="mt-6 border rounded-xl overflow-hidden bg-muted/30">
      <button
        onClick={() => (open ? setOpen(false) : handleInitialOpen())}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Ask with Study AI</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div className="max-h-[260px] overflow-y-auto space-y-3 pr-1">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                      <MarkdownRenderer content={m.content} />
                    </div>
                  </div>
                ))}
                {streamingText && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-xl px-3 py-2 text-sm bg-muted text-foreground">
                      <MarkdownRenderer content={streamingText} />
                      <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 align-middle rounded-sm animate-pulse" />
                    </div>
                  </div>
                )}
                {isLoading && !streamingText && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-full px-3 py-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Study AI is typing
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a follow-up..."
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleFollowUp(); }}
                />
                <Button size="icon" disabled={isLoading || !input.trim()} onClick={handleFollowUp}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
