import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Users, Target, TrendingUp, Award, AlertCircle } from 'lucide-react';
import type { QuizAnalytics, QuestionWiseAnalytics, QuizAttempt } from '@/types';
import { cn } from '@/lib/utils';

interface QuizAnalyticsDashboardProps {
  analytics: QuizAnalytics;
  questionAnalytics: QuestionWiseAnalytics[];
  attempts: QuizAttempt[];
}

export function QuizAnalyticsDashboard({ analytics, questionAnalytics, attempts }: QuizAnalyticsDashboardProps) {
  function formatTime(seconds: number | null) {
    if (seconds == null) return '-';
    const m = Math.floor(seconds / 60);
    return `${m}m ${seconds % 60}s`;
  }

  const statCards = [
    { label: 'Assigned', value: analytics.assigned, icon: Users },
    { label: 'Started', value: analytics.started, icon: Target },
    { label: 'Completed', value: analytics.completed, icon: Award },
    { label: 'Avg Score', value: analytics.average_score != null ? `${analytics.average_score}%` : '-', icon: TrendingUp },
    { label: 'Highest', value: analytics.highest_score != null ? `${analytics.highest_score}%` : '-', icon: Award },
    { label: 'Lowest', value: analytics.lowest_score != null ? `${analytics.lowest_score}%` : '-', icon: AlertCircle },
    { label: 'Avg Time', value: formatTime(analytics.average_time_seconds), icon: Clock },
    { label: 'Pass %', value: analytics.pass_percentage != null ? `${analytics.pass_percentage}%` : '-', icon: Target },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="border border-border/80">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <s.icon className="w-5 h-5 text-primary mb-2" />
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border/80">
        <CardHeader><CardTitle className="text-base">Question-wise Accuracy</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questionAnalytics.map((q) => (
              <div key={q.question_id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 pr-3">{q.question_text}</span>
                  <Badge variant="outline" className="capitalize text-xs">{q.accuracy ?? 0}%</Badge>
                </div>
                <Progress value={q.accuracy ?? 0} className="h-2" />
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>Correct: {q.correct_count}</span>
                  <span>Wrong: {q.incorrect_count}</span>
                  <span>Total: {q.total_attempts}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80">
        <CardHeader><CardTitle className="text-base">Option Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Option</TableHead>
                  <TableHead>Selected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questionAnalytics.flatMap((q) =>
                  q.option_stats.map((opt, i) => (
                    <TableRow key={`${q.question_id}-${i}`}>
                      <TableCell className="text-sm truncate max-w-[200px]">{q.question_text}</TableCell>
                      <TableCell className="text-sm">{String.fromCharCode(65 + i)}. {opt.option_text}</TableCell>
                      <TableCell className="text-sm font-medium">{opt.selected_count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80">
        <CardHeader><CardTitle className="text-base">Student Attempts</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Correct</TableHead>
                  <TableHead>Incorrect</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap">{a.student?.name || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{a.student?.class} {a.student?.section}</TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{a.percentage}%</TableCell>
                    <TableCell className="whitespace-nowrap text-green-600">{a.correct_count}</TableCell>
                    <TableCell className="whitespace-nowrap text-destructive">{a.incorrect_count}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatTime(a.time_spent_seconds)}</TableCell>
                  </TableRow>
                ))}
                {attempts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">No attempts yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
