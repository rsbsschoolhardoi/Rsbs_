import { motion } from 'motion/react';
import { Clock, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Quiz } from '@/types';

interface QuizWizardIntroProps {
  quiz: Quiz;
  questionCount: number;
  attemptNumber?: number;
  onStart: () => void;
  onBack: () => void;
  loading?: boolean;
}

export function QuizWizardIntro({
  quiz,
  questionCount,
  attemptNumber,
  onStart,
  onBack,
  loading,
}: QuizWizardIntroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card className="border border-border bg-card shadow-card overflow-hidden">
        <CardContent className="p-6 md:p-10 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">{quiz.answer_mode || 'end'} result</Badge>
              {quiz.difficulty && <Badge variant="secondary" className="capitalize">{quiz.difficulty}</Badge>}
              {quiz.timer_seconds && quiz.timer_seconds > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {quiz.timer_seconds}s
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-balance leading-tight">{quiz.title}</h1>
            {quiz.subject_name && <p className="text-sm text-muted-foreground">{quiz.subject_name}</p>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Questions" value={questionCount} />
            <Stat label="Passing" value={`${quiz.passing_percentage || 0}%`} />
            <Stat label="Attempts" value={attemptNumber ?? 1} />
            <Stat label="Marks/Q" value={quiz.marks_per_question || 1} />
          </div>

          {quiz.description && (
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{quiz.description}</p>
          )}

          <div className="rounded-xl bg-muted/50 border p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="w-4 h-4 text-primary" />
              <span>Instructions</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Read each question carefully before selecting your answer.</li>
              <li>
                {quiz.answer_mode === 'instant'
                  ? 'Your answer will be checked immediately.'
                  : quiz.answer_mode === 'confirm'
                    ? 'Confirm your answer to see feedback.'
                    : 'Answers will be revealed at the end.'}
              </li>
              {quiz.allow_navigation !== false && <li>You can go back and change your answer using Previous.</li>}
              <li>Submit the quiz when you finish the last question.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button variant="outline" onClick={onBack} className="w-full sm:w-auto" disabled={loading}>
              Back to Quizzes
            </Button>
            <Button onClick={onStart} disabled={loading} className="w-full sm:w-auto sm:ml-auto">
              {loading ? 'Starting...' : (
                <>
                  Start Quiz <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center rounded-lg bg-muted/50 border p-3">
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
