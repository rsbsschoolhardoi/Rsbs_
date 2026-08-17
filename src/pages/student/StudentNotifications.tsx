import React, { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { StudentPanelNotification } from '@/types';

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState<StudentPanelNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.getStudentPanelNotifications().then(({ data, error }) => {
      if (error) {
        toast.error('Failed to load notifications');
      } else {
        const list = (data || []).filter((n) => n.is_active).sort((a, b) => a.sort_order - b.sort_order);
        setNotifications(list);
        const map: Record<string, boolean> = {};
        list.forEach((n) => { map[n.key] = true; });
        setEnabled(map);
      }
      setLoading(false);
    });
  }, []);

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
        <h1 className="text-xl font-bold tracking-tight">Notification Settings</h1>
        <p className="text-sm text-muted-foreground">Choose which notifications you want to receive.</p>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No notification preferences configured.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Toggle notification channels set by your school.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Label className="font-medium">{n.label}</Label>
                  {n.description && <p className="text-xs text-muted-foreground">{n.description}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">Channel: {n.channel}</p>
                </div>
                <Switch
                  checked={enabled[n.key] ?? false}
                  onCheckedChange={(v) => setEnabled((prev) => ({ ...prev, [n.key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
