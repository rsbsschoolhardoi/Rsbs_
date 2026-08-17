import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Copy, GripVertical, ImagePlus, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/db/api';
import type { Question, QuestionOption } from '@/types';
import { cn } from '@/lib/utils';

interface QuestionFormProps {
  question: Question;
  index: number;
  onChange: (q: Question) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

export function QuestionForm({ question, index, onChange, onDelete, onDuplicate }: QuestionFormProps) {
  const [options, setOptions] = useState<QuestionOption[]>(question.options?.length ? question.options : [
    { id: '', question_id: question.id, option_text: '', is_correct: false, order_index: 0, created_at: '' },
    { id: '', question_id: question.id, option_text: '', is_correct: false, order_index: 1, created_at: '' },
  ]);

  const update = (updates: Partial<Question>) => onChange({ ...question, ...updates, options });

  const handleOptionChange = (idx: number, text: string) => {
    const next = options.map((o, i) => (i === idx ? { ...o, option_text: text } : o));
    setOptions(next);
    onChange({ ...question, options: next });
  };

  const handleCorrectChange = (idx: string) => {
    const correctIndex = Number(idx);
    const next = options.map((o, i) => ({ ...o, is_correct: i === correctIndex }));
    setOptions(next);
    onChange({ ...question, options: next });
  };

  const addOption = () => {
    const next = [...options, { id: '', question_id: question.id, option_text: '', is_correct: false, order_index: options.length, created_at: '' }];
    setOptions(next);
    onChange({ ...question, options: next });
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) { toast.error('At least two options required'); return; }
    const next = options.filter((_, i) => i !== idx);
    setOptions(next);
    onChange({ ...question, options: next });
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    const { data, error } = await api.uploadQuizImage(file);
    if (error) { toast.error('Upload failed'); return; }
    update({ image_url: data });
  };

  const correctIdx = options.findIndex((o) => o.is_correct);

  return (
    <Card className="border border-border/80">
      <CardHeader className="pb-2 flex flex-row items-center gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <GripVertical className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase">Q{index + 1}</span>
        </div>
        <CardTitle className="text-sm flex-1">Question {index + 1}</CardTitle>
        <div className="flex items-center gap-1">
          {onDuplicate && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate}><Copy className="w-4 h-4" /></Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Question Text</Label>
          <Textarea value={question.question_text} onChange={(e) => update({ question_text: e.target.value })} rows={3} placeholder="Enter question" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={question.difficulty || 'medium'} onValueChange={(v) => update({ difficulty: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Marks</Label>
            <Input type="number" min={0} step={0.25} value={question.marks || ''} onChange={(e) => update({ marks: Number(e.target.value) || 0 })} />
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            <Label className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm border rounded-md py-2 px-3 hover:bg-muted">
                <ImagePlus className="w-4 h-4" /> {question.image_url ? 'Replace' : 'Upload'}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0] || null)} />
            </Label>
          </div>
        </div>
        {question.image_url && (
          <div className="relative rounded-lg overflow-hidden border max-w-sm">
            <img src={question.image_url} alt="Question" className="w-full h-auto" />
          </div>
        )}
        <div className="space-y-2">
          <Label>Explanation</Label>
          <Textarea value={question.explanation || ''} onChange={(e) => update({ explanation: e.target.value })} rows={2} placeholder="Explanation shown after answering" />
        </div>
        <div className="space-y-2">
          <Label>Options — Select correct answer</Label>
          <RadioGroup value={String(correctIdx >= 0 ? correctIdx : '')} onValueChange={handleCorrectChange} className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className={cn('flex items-center gap-2 rounded-lg border p-2', o.is_correct && 'border-primary bg-primary/5')}>
                <RadioGroupItem value={String(i)} id={`${question.id}-opt-${i}`} />
                <Input
                  value={o.option_text}
                  onChange={(e) => handleOptionChange(i, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0"
                />
                {o.is_correct && <CheckCircle2 className="w-4 h-4 text-primary" />}
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeOption(i)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </RadioGroup>
          <Button variant="outline" size="sm" onClick={addOption}><Plus className="w-4 h-4 mr-1" /> Add Option</Button>
        </div>
      </CardContent>
    </Card>
  );
}
