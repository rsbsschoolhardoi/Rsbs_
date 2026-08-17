import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { AnswerOption } from './AnswerOption';
import { QuizAiBox } from './QuizAiBox';
import type { PlayerQuestion, Quiz, QuestionOption } from '@/types';

interface QuestionCardProps {
  quiz: Quiz;
  question: PlayerQuestion;
  questionIndex: number;
  totalQuestions: number;
  selectedOptionId?: string | null;
  showResult?: boolean;
  correctOptionId?: string | null;
  answerMode: 'instant' | 'confirm' | 'end';
  attemptId: string;
  disabled?: boolean;
  onSelect: (optionId: string) => void;
  onConfirm?: () => void;
  onNext?: () => void;
}

export function QuestionCard({
  quiz,
  question,
  questionIndex,
  totalQuestions,
  selectedOptionId,
  showResult,
  correctOptionId,
  answerMode,
  attemptId,
  disabled,
  onSelect,
  onConfirm,
  onNext,
}: QuestionCardProps) {
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  return (
    <motion.div
      key={question.question_id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
    >
      <Card className="border border-border bg-card shadow-card">
        <CardContent className="p-5 md:p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
              <span>Question {questionIndex + 1} of {totalQuestions}</span>
              <span>•</span>
              <span>{question.marks} marks</span>
              <span>•</span>
              <span className="capitalize">{question.difficulty}</span>
            </div>
            <h2 className="text-lg md:text-xl font-semibold leading-relaxed text-balance">{question.question_text}</h2>
            {question.image_url && (
              <div className="rounded-xl overflow-hidden border max-w-2xl">
                <img src={question.image_url} alt="Question" className="w-full h-auto object-cover" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            {question.options.map((opt, idx) => {
              const isSelected = selectedOptionId === opt.option_id;
              const isCorrect = showResult && correctOptionId === opt.option_id;
              const isWrong = showResult && isSelected && correctOptionId !== opt.option_id;
              return (
                <AnswerOption
                  key={opt.option_id}
                  label={labels[idx] || String(idx + 1)}
                  text={opt.option_text}
                  selected={isSelected}
                  isCorrect={showResult ? isCorrect : null}
                  isWrong={showResult ? isWrong : false}
                  disabled={disabled || (showResult && answerMode !== 'end')}
                  onClick={() => onSelect(opt.option_id)}
                />
              );
            })}
          </div>

          {answerMode === 'confirm' && selectedOptionId && !showResult && (
            <div className="flex justify-end">
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onConfirm}
                className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90"
              >
                Confirm Answer
              </motion.button>
            </div>
          )}

          {showResult && answerMode !== 'end' && (
            <QuizAiBox
              quiz={quiz}
              question={question}
              attemptId={attemptId}
              answerMode={answerMode}
              selectedOptionId={selectedOptionId}
              correctOptionId={correctOptionId}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
