import React, { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import type { StudentPanelSetting } from '@/types';

function getInitials(name?: string | null): string {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function StudentSettings() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<StudentPanelSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    api.getStudentPanelSettings().then(({ data, error }) => {
      if (error) {
        toast.error('Failed to load settings');
      } else {
        setSettings((data || []).filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order));
        const map: Record<string, string> = {};
        (data || []).forEach((s) => { map[s.key] = String(s.value ?? ''); });
        setValues(map);
      }
      setLoading(false);
    });
  }, []);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const fullName = profile?.student_name || profile?.username || 'Student';
  const loginId = profile?.verification_id || profile?.username || '';

  return (
    <div className="space-y-4 pb-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your app preferences.</p>
      </div>

      {/* Account identity */}
      <Card className="overflow-hidden border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border border-border/40 shrink-0">
              <AvatarImage src={profile?.avatar_url || ''} alt={fullName} className="object-cover" />
              <AvatarFallback className="bg-primary text-primary-foreground font-black text-base">
                {getInitials(fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground truncate leading-tight">{fullName}</p>
              <p className="text-sm text-muted-foreground truncate leading-tight">
                Login ID: <span className="font-mono text-xs text-muted-foreground/80">{loginId}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {settings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Settings className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No settings available.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Toggle options configured by your school.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.map((s) => (
              <div key={s.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">{s.label}</Label>
                  {s.type === 'toggle' && (
                    <Switch
                      checked={values[s.key] === 'true'}
                      onCheckedChange={(v) => handleChange(s.key, String(v))}
                    />
                  )}
                </div>
                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                {s.type === 'text' && (
                  <Input value={values[s.key] ?? ''} onChange={(e) => handleChange(s.key, e.target.value)} />
                )}
                {s.type === 'select' && (
                  <Select value={values[s.key] ?? ''} onValueChange={(v) => handleChange(s.key, v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {s.options?.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
