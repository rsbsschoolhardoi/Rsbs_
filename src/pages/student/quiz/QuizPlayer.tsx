import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { QuizPlayerHeader } from '@/components/quiz/QuizPlayerHeader';
import { QuizWizardIntro } from '@/components/quiz/QuizWizardIntro';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { api } from '@/db/api';
import { ROUTES } from '@/constants/routes';
import { toast } from 'sonner';
import type { Quiz, QuizAttempt, PlayerQuestion } from '@/types';

interface AnswerState {
  [questionId: string]: {
    selectedOptionId: string;
    answeredAt: number;
    isCorrect: boolean;
    correctOptionId: string | null;
    showResult: boolean;
  };
}

type Phase = 'intro' | 'playing' | 'submitting';

export default function QuizPlayer() {
  const { id: quizId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [questions, setQuestions] = useState<PlayerQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [phase, setPhase] = useState<Phase>('intro');
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const startTime = useRef(Date.now());
  const questionStart = useRef(Date.now());

  const isQuizWindowOpen = useMemo(() => {
    if (!quiz) return true;
    const closedStatuses = ['archived', 'completed', 'draft'];
    if (closedStatuses.includes(quiz.status)) return false;
    if (quiz.end_at) return new Date(quiz.end_at) > new Date();
    return true;
  }, [quiz]);

  const loadQuestions = useCallback(async (attemptId: string, quizData: Quiz) => {
    const [playerRes, answersRes] = await Promise.all([
      api.getQuizQuestionsForPlayer(quizId!, attemptId),
      api.getAttemptAnswers(attemptId),
    ]);
    if (playerRes.error || !playerRes.data) {
      toast.error('Could not load quiz');
      navigate(ROUTES.STUDENT.QUIZ);
      return;
    }
    const loadedQuestions = playerRes.data.questions as PlayerQuestion[];
    setQuestions(loadedQuestions);

    if (answersRes.data) {
      const correctMap = new Map(loadedQuestions.map((q) => [q.question_id, q.correct_option_id]));
      const restored: AnswerState = {};
      for (const a of answersRes.data as any[]) {
        restored[a.question_id] = {
          selectedOptionId: a.selected_option_id,
          answeredAt: a.answered_at ? new Date(a.answered_at).getTime() : Date.now(),
          isCorrect: a.is_correct,
          correctOptionId: correctMap.get(a.question_id) || null,
          showResult: quizData.answer_mode !== 'end',
        };
      }
      setAnswers(restored);
    }
  }, [quizId, navigate]);

  const loadQuiz = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    const { data: quizData, error: quizError } = await api.getQuizById(quizId);
    if (quizError || !quizData) {
      toast.error('Quiz not found');
      navigate(ROUTES.STUDENT.QUIZ);
      return;
    }
    setQuiz(quizData as Quiz);

    const { data: attempts } = await api.getMyQuizAttempts(quizId);
    const inProgress = (attempts || []).find((a) => a.status === 'in_progress');
    const completed = (attempts || []).find((a) => a.status === 'completed');
    if (completed && !quizData.allow_retry) {
      navigate(ROUTES.STUDENT.QUIZ_RESULT(completed.id));
      return;
    }

    if (inProgress) {
      const resumed = inProgress as QuizAttempt;
      setAttempt(resumed);
      setIndex(
        typeof resumed.current_question_index === 'number' && resumed.current_question_index >= 0
          ? resumed.current_question_index
          : 0
      );
      startTime.current = Date.now() - (resumed.time_spent_seconds || 0) * 1000;
      await loadQuestions(resumed.id, quizData as Quiz);
      setPhase('playing');
    } else {
      setPhase('intro');
    }
    setLoading(false);
  }, [quizId, navigate, loadQuestions]);

  useEffect(() => { loadQuiz(); }, [loadQuiz]);

  const handleStart = async () => {
    if (!quiz) return;
    setStarting(true);
    const { data: newAttempt, error: attemptError } = await api.startQuizAttempt(quiz.id);
    if (attemptError || !newAttempt) {
      toast.error('Could not start quiz');
      setStarting(false);
      return;
    }
    setAttempt(newAttempt as QuizAttempt);
    startTime.current = Date.now();
    await loadQuestions(newAttempt.id, quiz);
    setPhase('playing');
    setStarting(false);
  };

  useEffect(() => {
    questionStart.current = Date.now();
  }, [index]);

  const currentQuestion = questions[index];
  const currentAnswer = currentQuestion ? answers[currentQuestion.question_id] : null;

  const getTotalTime = () => Math.round((Date.now() - startTime.current) / 1000);

  const saveProgress = async (targetIndex: number, opts?: { silent?: boolean }) => {
    if (!attempt) return;
    setSavingProgress(true);
    const { error } = await api.saveQuizProgress(attempt.id, targetIndex, getTotalTime());
    setSavingProgress(false);
    if (error && !opts?.silent) {
      toast.error('Failed to save progress', { description: error.message });
    }
  };

  const handleSelect = async (optionId: string) => {
    if (!currentQuestion || !attempt || savingAnswer) return;
    if (currentAnswer?.showResult && quiz?.answer_mode === 'instant') return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.question_id]: {
        ...prev[currentQuestion.question_id],
        selectedOptionId: optionId,
      },
    }));

    if (quiz?.answer_mode === 'instant') {
      await handleConfirm(optionId);
    } else if (quiz?.answer_mode === 'end') {
      await saveAnswer(optionId);
    }
  };

  const saveAnswer = async (optionId: string) => {
    if (!attempt || !currentQuestion) return;
    setSavingAnswer(true);
    const timeSpent = Math.round((Date.now() - questionStart.current) / 1000);
    const { data, error } = await api.saveAnswer(
      attempt.id,
      currentQuestion.question_id,
      optionId,
      timeSpent,
      index
    );
    setSavingAnswer(false);
    if (error) {
      toast.error('Failed to save answer', { description: error.message });
      return;
    }
    if (quiz?.answer_mode === 'end') {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.question_id]: {
          ...prev[currentQuestion.question_id],
          selectedOptionId: optionId,
          answeredAt: Date.now(),
          showResult: false,
        },
      }));
    }
    return data;
  };

  const handleConfirm = async (optionId?: string) => {
    if (!attempt || !currentQuestion || savingAnswer) return;
    const finalOptionId = optionId || currentAnswer?.selectedOptionId;
    if (!finalOptionId) return;
    setSavingAnswer(true);
    const timeSpent = Math.round((Date.now() - questionStart.current) / 1000);
    const { data, error } = await api.saveAnswer(
      attempt.id,
      currentQuestion.question_id,
      finalOptionId,
      timeSpent,
      index
    );
    setSavingAnswer(false);
    if (error) {
      toast.error('Failed to submit answer', { description: error.message });
      return;
    }
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.question_id]: {
        selectedOptionId: finalOptionId,
        answeredAt: Date.now(),
        isCorrect: data?.is_correct ?? false,
        correctOptionId: data?.correct_option_id ?? currentQuestion.correct_option_id,
        showResult: true,
      },
    }));
  };

  const answeredCount = Object.values(answers).filter((a) => a.selectedOptionId).length;

  const handleFinalSubmit = () => {
    if (answeredCount < questions.length) {
      setShowSubmitDialog(true);
    } else {
      submitAttempt();
    }
  };

  const submitAttempt = async () => {
    if (!attempt) return;
    setShowSubmitDialog(false);
    setSubmitting(true);
    setPhase('submitting');
    const totalTime = getTotalTime();
    const { data, error } = await api.submitQuizAttempt(attempt.id, totalTime);
    setSubmitting(false);
    if (error || !data) {
      setPhase('playing');
      toast.error('Failed to submit quiz', { description: error?.message });
      return;
    }
    toast.success('Quiz submitted!');
    navigate(ROUTES.STUDENT.QUIZ_RESULT(data.id));
  };

  const handleNext = async () => {
    if (index < questions.length - 1) {
      const nextIndex = index + 1;
      await saveProgress(nextIndex, { silent: true });
      setIndex(nextIndex);
    } else {
      handleFinalSubmit();
    }
  };

  const handlePrev = async () => {
    if (index > 0) {
      const prevIndex = index - 1;
      await saveProgress(prevIndex, { silent: true });
      setIndex(prevIndex);
    }
  };

  const handleSaveAndExit = async () => {
    if (!attempt) return;
    setSavingProgress(true);
    await api.saveQuizProgress(attempt.id, index, getTotalTime());
    setSavingProgress(false);
    setShowExitWarning(false);
    navigate(ROUTES.STUDENT.QUIZ);
  };

  const handleExit = () => setShowExitWarning(true);

  if (loading) {
    return (
      <div className="min-h-full flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!quiz) {
    return <div className="p-8 text-center">Quiz could not be loaded.</div>;
  }

  if (phase === 'intro') {
    return (
      <div className="min-h-full flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <QuizWizardIntro
            quiz={quiz}
            questionCount={questions.length || quiz.number_of_questions || 0}
            attemptNumber={(quiz.my_attempts?.length || 0) + 1}
            onStart={handleStart}
            onBack={() => navigate(ROUTES.STUDENT.QUIZ)}
            loading={starting}
          />
        </div>
      </div>
    );
  }

  if (!currentQuestion || !attempt) {
    return <div className="p-8 text-center">Quiz could not be loaded.</div>;
  }

  const showResult = quiz.answer_mode === 'instant' ? (currentAnswer?.showResult || false) : false;
  const correctOptionId = currentAnswer?.correctOptionId || currentQuestion.correct_option_id;
  const isLast = index === questions.length - 1;

  return (
    <div className="min-h-full flex flex-col bg-background">
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 md:py-6">
        <QuizPlayerHeader
          quizTitle={quiz.title}
          currentIndex={index}
          totalQuestions={questions.length}
          timerSeconds={quiz.timer_seconds}
        />
        <div className="flex-1 py-4">
          <AnimatePresence mode="wait">
            <QuestionCard
              key={currentQuestion.question_id}
              quiz={quiz}
              question={currentQuestion}
              questionIndex={index}
              totalQuestions={questions.length}
              selectedOptionId={currentAnswer?.selectedOptionId}
              showResult={showResult}
              correctOptionId={correctOptionId}
              answerMode={quiz.answer_mode}
              attemptId={attempt.id}
              disabled={savingAnswer}
              onSelect={handleSelect}
              onConfirm={() => handleConfirm()}
              onNext={handleNext}
            />
          </AnimatePresence>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 py-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={index === 0 || savingProgress || savingAnswer}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground order-1 sm:order-2 sm:mx-auto">
            <span className="font-medium text-foreground">{answeredCount}</span> of {questions.length} answered
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto order-3 sm:order-3">
            {quiz.answer_mode === 'confirm' && !currentAnswer?.showResult && (
              <Button
                onClick={() => handleConfirm()}
                disabled={!currentAnswer?.selectedOptionId || savingAnswer}
                className="w-full sm:w-auto"
              >
                {savingAnswer ? 'Saving...' : 'Confirm'}
              </Button>
            )}
            <Button
              onClick={isLast ? handleFinalSubmit : handleNext}
              disabled={savingProgress || savingAnswer || (isLast && answeredCount === 0)}
              className="w-full sm:w-auto"
            >
              {isLast ? (submitting ? 'Submitting...' : 'Submit') : (
                <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>

        <div className="flex justify-center pb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExit}
            disabled={!isQuizWindowOpen || savingProgress}
            title={isQuizWindowOpen ? 'Save progress and exit' : 'Quiz window has already closed'}
            className="text-muted-foreground"
          >
            <Flag className="w-4 h-4 mr-1" />
            {savingProgress ? 'Saving...' : 'Save and exit'}
          </Button>
        </div>
      </div>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit quiz now?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} of {questions.length} questions. Unanswered questions will be marked as incorrect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSubmitDialog(false)}>Keep working</AlertDialogCancel>
            <AlertDialogAction onClick={submitAttempt} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit anyway'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showExitWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-sm w-full">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-500">
                <Flag className="w-5 h-5" />
                <span className="font-semibold">Save & exit?</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your current question and answers will be saved. You can continue later from the In Progress tab.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowExitWarning(false)} disabled={savingProgress}>
                  Stay
                </Button>
                <Button onClick={handleSaveAndExit} disabled={savingProgress}>
                  {savingProgress ? 'Saving...' : 'Save & Exit'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
