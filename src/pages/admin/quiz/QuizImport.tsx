import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseQuizFile, ImportedQuestion, ColumnMapping } from '@/lib/quizFileParser';
import { ImportPreviewTable } from '@/components/quiz/ImportPreviewTable';
import { api } from '@/db/api';
import { ROUTES } from '@/constants/routes';
import { toast } from 'sonner';
import type { Quiz, Question } from '@/types';

export default function QuizImport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<ImportedQuestion[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | undefined>(undefined);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getQuizById(id).then(({ data }) => data && setQuiz(data as Quiz));
  }, [id]);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const parsed = await parseQuizFile(file);
      setQuestions(parsed.questions);
      setMapping(parsed.mapping);
    } catch {
      toast.error('Failed to parse file');
      setQuestions([]);
      setMapping(undefined);
    }
  };

  const handleImport = async () => {
    if (!id) return;
    const valid = questions.filter((q) => !q.errors?.length && q.question_text && q.options.length >= 2 && q.correct_index >= 0);
    if (valid.length === 0) { toast.error('No valid questions to import'); return; }
    setImporting(true);
    const { data: existing, error: existingError } = await api.getQuizQuestions(id);
    if (existingError) { setImporting(false); toast.error('Failed to load existing questions'); return; }
    const startIndex = existing.length;

    for (let i = 0; i < valid.length; i++) {
      const q = valid[i];
      const options = q.options.map((opt, idx) => ({
        option_text: opt,
        is_correct: idx === q.correct_index,
        order_index: idx,
      }));
      try {
        const { error } = await api.saveQuestion({
          quiz_id: id,
          question_text: q.question_text,
          explanation: q.explanation || null,
          difficulty: q.difficulty || 'medium',
          subject: q.subject || null,
          chapter: q.chapter || null,
          topic: q.topic || null,
          question_id: q.question_id || null,
          marks: q.marks ?? 1,
          order_index: startIndex + i,
          metadata: q.metadata || {},
        } as Partial<Question>, options);
        if (error) {
          console.error('Import error at question', i + 1, error);
          toast.error(`Failed to import question ${i + 1}: ${error.message || 'Unknown error'}`);
          setImporting(false);
          return;
        }
      } catch (err) {
        console.error('Import exception at question', i + 1, err);
        toast.error(`Failed to import question ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setImporting(false);
        return;
      }
    }

    const { error: countError } = await api.updateQuiz(id, {
      number_of_questions: (existing?.length || 0) + valid.length,
    } as Partial<Quiz>);

    setImporting(false);
    if (countError) {
      toast.error('Questions imported, but failed to update quiz count');
      navigate(ROUTES.ADMIN.QUIZ_EDIT(id));
      return;
    }

    toast.success(`${valid.length} questions imported`);
    navigate(ROUTES.ADMIN.QUIZ_EDIT(id));
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => id && navigate(ROUTES.ADMIN.QUIZ_EDIT(id))}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Import Questions</h1>
            <p className="text-sm text-muted-foreground">{quiz?.title || 'Quiz'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => id && navigate(ROUTES.ADMIN.QUIZ_EDIT(id))}>Back to Builder</Button>
          <Button onClick={handleImport} disabled={importing || questions.filter((q) => !q.errors?.length).length === 0}>
            {importing ? 'Importing...' : 'Import Valid Questions'}
          </Button>
        </div>
      </div>

      <Card className="border border-border/80 border-dashed">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Upload CSV, JSON, JSONL, TXT or XLSX</p>
            <p className="text-xs text-muted-foreground">Questions will be automatically detected and previewed.</p>
          </div>
          <label className="cursor-pointer">
            <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
              Choose File
            </div>
            <input type="file" accept=".csv,.json,.jsonl,.txt,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
          {fileName && <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> {fileName}</p>}
        </CardContent>
      </Card>

      {questions.length > 0 && (
        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Import Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImportPreviewTable questions={questions} onChange={setQuestions} mapping={mapping} />
          </CardContent>
        </Card>
      )}

      {questions.length > 0 && questions.every((q) => !q.errors?.length) && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="w-4 h-4" /> All {questions.length} questions are valid.
        </div>
      )}
    </div>
  );
}
