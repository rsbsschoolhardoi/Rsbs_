import React, { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { StudentPanelPrivacyPolicy } from '@/types';

export default function StudentPrivacyPolicy() {
  const [policies, setPolicies] = useState<StudentPanelPrivacyPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudentPanelPrivacyPolicy().then(({ data, error }) => {
      if (error) {
        toast.error('Failed to load privacy policy');
      } else {
        setPolicies((data || []).filter((p) => p.is_active).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      setLoading(false);
    });
  }, []);

  const activePolicy = policies[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">How your school protects your data.</p>
      </div>

      {!activePolicy ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No privacy policy configured.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle>{activePolicy.title}</CardTitle>
              <Badge variant="outline">v{activePolicy.version}</Badge>
            </div>
            <CardDescription>
              Effective {new Date(activePolicy.effective_date).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground">
              {activePolicy.content}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
