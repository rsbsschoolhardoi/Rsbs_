import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, CheckCircle2, Map } from 'lucide-react';
import type { ImportedQuestion, ColumnMapping } from '@/lib/quizFileParser';
import { cn } from '@/lib/utils';

interface ImportPreviewTableProps {
  questions: ImportedQuestion[];
  onChange: (questions: ImportedQuestion[]) => void;
  mapping?: ColumnMapping;
}

export function ImportPreviewTable({ questions, onChange, mapping }: ImportPreviewTableProps) {
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const updateQuestion = (idx: number, q: ImportedQuestion) => {
    const next = [...questions];
    next[idx] = q;
    onChange(next);
  };

  const updateOption = (idx: number, optIdx: number, value: string) => {
    const q = questions[idx];
    const options = [...q.options];
    options[optIdx] = value;
    updateQuestion(idx, { ...q, options });
  };

  const addOption = (idx: number) => {
    const q = questions[idx];
    updateQuestion(idx, { ...q, options: [...q.options, ''] });
  };

  const removeOption = (idx: number, optIdx: number) => {
    const q = questions[idx];
    if (q.options.length <= 2) return;
    const options = q.options.filter((_, i) => i !== optIdx);
    updateQuestion(idx, { ...q, options });
  };

  const setCorrect = (idx: number, optIdx: number) => {
    updateQuestion(idx, { ...questions[idx], correct_index: optIdx });
  };

  const deleteQuestion = (idx: number) => {
    const next = questions.filter((_, i) => i !== idx);
    onChange(next);
  };

  const valid = questions.filter((q) => !q.errors?.length);
  const invalid = questions.filter((q) => q.errors?.length);

  const renderMapping = () => {
    if (!mapping) return null;
    const optionLabel = mapping.options.length > 0
      ? mapping.options.map((o) => o.original).join(', ')
      : mapping.combinedOptions || 'Not detected';
    const rows = [
      { label: 'Question', value: mapping.question || 'Not detected' },
      { label: 'Options', value: optionLabel },
      { label: 'Correct Answer', value: mapping.correctAnswer || 'Not detected' },
      { label: 'Explanation', value: mapping.explanation || 'Not detected' },
      { label: 'Difficulty', value: mapping.difficulty || 'Not detected' },
      { label: 'Subject', value: mapping.subject || 'Not detected' },
      { label: 'Class', value: mapping.class || 'Not detected' },
      { label: 'Chapter', value: mapping.chapter || 'Not detected' },
      { label: 'Topic', value: mapping.topic || 'Not detected' },
      { label: 'Source', value: mapping.source || 'Not detected' },
      { label: 'Question ID', value: mapping.id || 'Not detected' },
    ];
    return (
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Map className="w-4 h-4" />
          Detected Column Mapping
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-medium truncate" title={r.value}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderMapping()}
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-4 h-4" /> {valid.length} valid</span>
        <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-4 h-4" /> {invalid.length} need fix</span>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="min-w-[220px]">Question</TableHead>
              <TableHead className="min-w-[200px]">Options</TableHead>
              <TableHead className="w-20">Correct</TableHead>
              <TableHead className="min-w-[200px]">Explanation</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((q, idx) => {
              const isEditing = editIdx === idx;
              return (
                <TableRow key={idx} className={cn(q.errors?.length && 'bg-amber-500/5')}>
                  <TableCell className="align-top">{idx + 1}</TableCell>
                  <TableCell className="align-top min-w-[220px]">
                    {isEditing ? (
                      <Textarea value={q.question_text} onChange={(e) => updateQuestion(idx, { ...q, question_text: e.target.value })} rows={2} />
                    ) : (
                      <div className="text-sm font-medium">{q.question_text}</div>
                    )}
                    {q.errors?.length ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {q.errors.map((err, i) => (<Badge key={i} variant="destructive" className="text-[10px]">{err}</Badge>))}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top min-w-[200px]">
                    {isEditing ? (
                      <div className="space-y-1">
                        {q.options.map((opt, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <Input value={opt} onChange={(e) => updateOption(idx, i, e.target.value)} className="text-xs h-8" />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOption(idx, i)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addOption(idx)}>Add option</Button>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {q.options.map((opt, i) => (
                          <div key={i} className={cn('text-xs', i === q.correct_index && 'font-semibold text-green-600')}>{String.fromCharCode(65 + i)}. {opt}</div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top w-20">
                    {isEditing ? (
                      <select
                        value={q.correct_index}
                        onChange={(e) => setCorrect(idx, Number(e.target.value))}
                        className="h-8 rounded-md border px-2 text-sm"
                      >
                        {q.options.map((_, i) => (<option key={i} value={i}>{String.fromCharCode(65 + i)}</option>))}
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-green-600">{q.correct_index >= 0 ? String.fromCharCode(65 + q.correct_index) : '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="align-top min-w-[200px]">
                    {isEditing ? (
                      <Textarea value={q.explanation || ''} onChange={(e) => updateQuestion(idx, { ...q, explanation: e.target.value })} rows={2} />
                    ) : (
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">{q.explanation || '-'}</div>
                    )}
                  </TableCell>
                  <TableCell className="align-top w-24">
                    {q.errors?.length ? (
                      <Badge variant="destructive" className="text-[10px]">Needs fix</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-green-600">Valid</Badge>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditIdx(isEditing ? null : idx)}>
                        {isEditing ? 'Done' : 'Edit'}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteQuestion(idx)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
