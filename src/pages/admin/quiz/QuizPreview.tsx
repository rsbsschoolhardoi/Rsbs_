import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/db/api';
import { ROUTES } from '@/constants/routes';
import type { Quiz, Question } from '@/types';

export default function QuizPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await api.getQuizPreviewData(id);
      if (error) { setLoading(false); return; }
      setQuiz(data?.quiz as Quiz);
      setQuestions(data?.questions || []);
      setLoading(false);
    };
    load();
  }, [id]);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => id && navigate(ROUTES.ADMIN.QUIZ_EDIT(id))}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Preview: {quiz?.title || 'Quiz'}</h1>
            <p className="text-sm text-muted-foreground">Student preview mode</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary w-fit"><Eye className="w-3 h-3 mr-1" /> Preview</Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <Card key={q.id} className="border border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Question {idx + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm font-medium">{q.question_text}</p>
                {q.image_url && <img src={q.image_url} alt="Question" className="max-w-sm rounded-lg border" />}
                <div className="space-y-1">
                  {q.options?.map((o, i) => (
                    <div key={o.id} className={`text-sm p-2 rounded border ${o.is_correct ? 'bg-green-500/10 border-green-500 text-green-600' : 'bg-muted/30'}`}>
                      {String.fromCharCode(65 + i)}. {o.option_text} {o.is_correct && '✓'}
                    </div>
                  ))}
                </div>
                {q.explanation && <p className="text-xs text-muted-foreground">{q.explanation}</p>}
              </CardContent>
            </Card>
          ))}
          {questions.length === 0 && <p className="text-center text-muted-foreground py-10">No questions to preview.</p>}
        </div>
      )}
    </div>
  );
}
