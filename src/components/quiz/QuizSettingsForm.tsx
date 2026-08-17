import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagePlus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/db/api';
import type { Quiz, Subject, QuizDifficulty, QuizAnswerMode, QuizStatus } from '@/types';
import { cn } from '@/lib/utils';

interface QuizSettingsFormProps {
  quiz: Partial<Quiz>;
  onChange: (quiz: Partial<Quiz>) => void;
}

export function QuizSettingsForm({ quiz, onChange }: QuizSettingsFormProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    api.getSubjects().then(({ data }) => setSubjects(data || []));
  }, []);

  const update = (updates: Partial<Quiz>) => onChange({ ...quiz, ...updates });

  const handleNumberChange = (field: keyof Quiz, value: string, min = 0, max = 1000) => {
    const parsed = value === '' ? undefined : Math.min(max, Math.max(min, Number(value)));
    update({ [field]: parsed } as Partial<Quiz>);
  };

  const handleImageUpload = async (field: 'cover_url' | 'icon', file: File | null) => {
    if (!file) return;
    const { data, error } = await api.uploadQuizImage(file);
    if (error) { toast.error('Upload failed'); return; }
    update({ [field]: data } as Partial<Quiz>);
  };

  const renderGeneral = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Quiz Title</Label>
          <Input value={quiz.title || ''} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. Class 9 Math Chapter 1" />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={quiz.status || 'draft'} onValueChange={(v) => update({ status: v as QuizStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="preview">Preview</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={quiz.description || ''} onChange={(e) => update({ description: e.target.value })} rows={3} placeholder="Short description shown to students" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={quiz.subject_id || '__none__'} onValueChange={(v) => update({ subject_id: v === '__none__' ? null : v })}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No subject</SelectItem>
              {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Academic Session</Label>
          <Input value={quiz.academic_session || ''} onChange={(e) => update({ academic_session: e.target.value })} placeholder="e.g. 2025-26" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Chapter</Label>
          <Input value={quiz.chapter || ''} onChange={(e) => update({ chapter: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Topic</Label>
          <Input value={quiz.topic || ''} onChange={(e) => update({ topic: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Input value={quiz.category || ''} onChange={(e) => update({ category: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Select value={quiz.difficulty || 'medium'} onValueChange={(v) => update({ difficulty: v as QuizDifficulty })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Answer Mode</Label>
          <Select value={quiz.answer_mode || 'instant'} onValueChange={(v) => update({ answer_mode: v as QuizAnswerMode })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant Result</SelectItem>
              <SelectItem value="confirm">Confirm Answer</SelectItem>
              <SelectItem value="end">Result at End</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cover Image</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="aspect-video rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
              {quiz.cover_url ? <img src={quiz.cover_url} alt="Cover" className="w-full h-full object-cover" /> : <ImagePlus className="w-8 h-8 text-muted-foreground" />}
            </div>
            <Label className="cursor-pointer">
              <div className="flex items-center justify-center gap-2 text-sm border rounded-md py-2 hover:bg-muted">
                <Upload className="w-4 h-4" /> Upload Cover
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('cover_url', e.target.files?.[0] || null)} />
            </Label>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Icon / Thumbnail</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center overflow-hidden max-w-[160px] mx-auto">
              {quiz.icon ? <img src={quiz.icon} alt="Icon" className="w-full h-full object-cover" /> : <ImagePlus className="w-8 h-8 text-muted-foreground" />}
            </div>
            <Label className="cursor-pointer">
              <div className="flex items-center justify-center gap-2 text-sm border rounded-md py-2 hover:bg-muted">
                <Upload className="w-4 h-4" /> Upload Icon
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('icon', e.target.files?.[0] || null)} />
            </Label>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderBehavior = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Number of Questions</Label>
          <Input type="number" min={0} value={quiz.number_of_questions ?? ''} onChange={(e) => handleNumberChange('number_of_questions', e.target.value, 0)} />
        </div>
        <div className="space-y-2">
          <Label>Timer (seconds) — leave empty for no timer</Label>
          <Input type="number" min={0} value={quiz.timer_seconds ?? ''} onChange={(e) => handleNumberChange('timer_seconds', e.target.value, 0)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Marks per Question</Label>
          <Input type="number" min={0} step={0.25} value={quiz.marks_per_question ?? ''} onChange={(e) => handleNumberChange('marks_per_question', e.target.value, 0)} />
        </div>
        <div className="space-y-2">
          <Label>Negative Marks (per wrong answer)</Label>
          <Input type="number" min={0} step={0.25} value={quiz.negative_marks ?? ''} onChange={(e) => handleNumberChange('negative_marks', e.target.value, 0)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Passing Percentage</Label>
          <div className="flex items-center gap-4">
            <Slider value={[quiz.passing_percentage || 0]} min={0} max={100} step={5} onValueChange={([v]) => update({ passing_percentage: v })} className="flex-1" />
            <span className="w-12 text-sm font-medium">{quiz.passing_percentage ?? 0}%</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Maximum Attempts</Label>
          <Input type="number" min={1} value={quiz.max_attempts ?? 1} onChange={(e) => handleNumberChange('max_attempts', e.target.value, 1)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-sm">Random Questions</Label>
            <p className="text-xs text-muted-foreground">Shuffle question order for each attempt</p>
          </div>
          <Switch checked={quiz.random_questions || false} onCheckedChange={(v) => update({ random_questions: v })} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-sm">Random Options</Label>
            <p className="text-xs text-muted-foreground">Shuffle option order for each attempt</p>
          </div>
          <Switch checked={quiz.random_options || false} onCheckedChange={(v) => update({ random_options: v })} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-sm">Allow Navigation</Label>
            <p className="text-xs text-muted-foreground">Let students move between questions</p>
          </div>
          <Switch checked={quiz.allow_navigation !== false} onCheckedChange={(v) => update({ allow_navigation: v })} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-sm">Show Explanations</Label>
            <p className="text-xs text-muted-foreground">Show official explanations after answering</p>
          </div>
          <Switch checked={quiz.show_explanations !== false} onCheckedChange={(v) => update({ show_explanations: v })} />
        </div>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-sm">Allow Retry</Label>
          <p className="text-xs text-muted-foreground">Students can retry after completion</p>
        </div>
        <Switch checked={quiz.allow_retry || false} onCheckedChange={(v) => update({ allow_retry: v })} />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-sm">Show Result Review</Label>
          <p className="text-xs text-muted-foreground">Show question-wise review after submission</p>
        </div>
        <Switch checked={quiz.show_result_review !== false} onCheckedChange={(v) => update({ show_result_review: v })} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input type="datetime-local" value={quiz.start_at ? new Date(quiz.start_at).toISOString().slice(0, 16) : ''} onChange={(e) => update({ start_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <Input type="datetime-local" value={quiz.end_at ? new Date(quiz.end_at).toISOString().slice(0, 16) : ''} onChange={(e) => update({ end_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </div>
      </div>
    </div>
  );

  const renderAccess = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-sm">Study AI</Label>
          <p className="text-xs text-muted-foreground">Allow &quot;Ask with Study AI&quot; after answering</p>
        </div>
        <Switch checked={quiz.study_ai_enabled !== false} onCheckedChange={(v) => update({ study_ai_enabled: v })} />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-sm">Leaderboard</Label>
          <p className="text-xs text-muted-foreground">Show ranked scores if supported</p>
        </div>
        <Switch checked={quiz.show_leaderboard || false} onCheckedChange={(v) => update({ show_leaderboard: v })} />
      </div>
      <div className="space-y-2">
        <Label>Advanced Settings (JSON)</Label>
        <Textarea
          value={JSON.stringify(quiz.settings || {}, null, 2)}
          onChange={(e) => {
            try { update({ settings: JSON.parse(e.target.value || '{}') }); } catch {}
          }}
          rows={6}
          className="font-mono text-xs"
        />
      </div>
      <div className="space-y-2">
        <Label>Appearance Overrides (JSON)</Label>
        <Textarea
          value={JSON.stringify(quiz.appearance || {}, null, 2)}
          onChange={(e) => {
            try { update({ appearance: JSON.parse(e.target.value || '{}') }); } catch {}
          }}
          rows={6}
          className="font-mono text-xs"
        />
      </div>
    </div>
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={cn('grid w-full', 'grid-cols-4 md:grid-cols-4')}>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="behavior">Behavior</TabsTrigger>
        <TabsTrigger value="results">Results & Timing</TabsTrigger>
        <TabsTrigger value="access">Access & AI</TabsTrigger>
      </TabsList>
      <div className="mt-6">
        <TabsContent value="general">{renderGeneral()}</TabsContent>
        <TabsContent value="behavior">{renderBehavior()}</TabsContent>
        <TabsContent value="results">{renderResults()}</TabsContent>
        <TabsContent value="access">{renderAccess()}</TabsContent>
      </div>
    </Tabs>
  );
}
