import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { AttendanceConfig } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Clock, Shield, Save, Loader2, AlertCircle } from 'lucide-react';

export default function AttendanceSettings() {
  const [config, setConfig] = useState<AttendanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('09:00');
  const [isEnabled, setIsEnabled] = useState(true);

  const [earlyLeaveStartTime, setEarlyLeaveStartTime] = useState('12:00');
  const [earlyLeaveEndTime, setEarlyLeaveEndTime] = useState('16:00');
  const [isEarlyLeaveEnabled, setIsEarlyLeaveEnabled] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data } = await api.getAttendanceConfig();
      if (data) {
        setConfig(data);
        // Extract HH:mm from HH:mm:ss if needed, but Supabase TIME usually returns HH:mm:ss
        setStartTime(data.start_time.substring(0, 5));
        setEndTime(data.end_time.substring(0, 5));
        setIsEnabled(data.is_restriction_enabled);

        if (data.early_leave_start_time) setEarlyLeaveStartTime(data.early_leave_start_time.substring(0, 5));
        if (data.early_leave_end_time) setEarlyLeaveEndTime(data.early_leave_end_time.substring(0, 5));
        if (data.is_early_leave_restriction_enabled !== undefined) setIsEarlyLeaveEnabled(data.is_early_leave_restriction_enabled);
      }
    } catch (error) {
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await api.updateAttendanceConfig(config.id, {
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        is_restriction_enabled: isEnabled,
        early_leave_start_time: earlyLeaveStartTime + ':00',
        early_leave_end_time: earlyLeaveEndTime + ':00',
        is_early_leave_restriction_enabled: isEarlyLeaveEnabled,
      });
      if (error) throw error;
      toast.success('Attendance window updated successfully');
      fetchConfig();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="border-none shadow-lg rounded-2xl bg-card overflow-hidden">
        <CardHeader className="bg-primary/5 p-8 border-b border-primary/10">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold text-primary uppercase tracking-tight">Time Window Control</CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground font-medium mt-1">Define when teachers can mark attendance</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-dashed">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Time Restriction
              </Label>
              <p className="text-xs text-muted-foreground font-medium">Enable or disable the daily attendance window</p>
            </div>
            <Switch 
              checked={isEnabled} 
              onCheckedChange={setIsEnabled}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground ml-1">Start Time</Label>
              <div className="relative group">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={!isEnabled}
                  className="pl-11 h-12 rounded-2xl border-muted bg-muted/10 focus-visible:ring-primary focus-visible:border-primary transition-all font-mono text-lg"
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground ml-1">End Time</Label>
              <div className="relative group">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  type="time" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!isEnabled}
                  className="pl-11 h-12 rounded-2xl border-muted bg-muted/10 focus-visible:ring-primary focus-visible:border-primary transition-all font-mono text-lg"
                />
              </div>
            </div>
          </div>

          <div className="bg-warning/10 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-2xl p-4 flex gap-4">
            <AlertCircle className="w-5 h-5 text-warning dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-tight">Restriction Protocol</p>
              <p className="text-[11px] text-warning/80 dark:text-amber-400/80 leading-relaxed font-medium">
                When enabled, teachers will be restricted from marking or editing attendance outside the defined {startTime} - {endTime} window. Admins bypass this restriction and can always modify attendance.
              </p>
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            Update Restriction Window
          </Button>
        </CardContent>
      </Card>


      <Card className="border-none shadow-lg rounded-2xl bg-card overflow-hidden">
        <CardHeader className="bg-primary/5 p-8 border-b border-primary/10">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold text-primary uppercase tracking-tight">Early Leave Window</CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground font-medium mt-1">Define when teachers can mark early leaves</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-dashed">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Early Leave Restriction
              </Label>
              <p className="text-xs text-muted-foreground font-medium">Enable or disable the early leave marking window</p>
            </div>
            <Switch 
              checked={isEarlyLeaveEnabled} 
              onCheckedChange={setIsEarlyLeaveEnabled}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground ml-1">Start Time</Label>
              <div className="relative group">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  type="time" 
                  value={earlyLeaveStartTime}
                  onChange={(e) => setEarlyLeaveStartTime(e.target.value)}
                  disabled={!isEarlyLeaveEnabled}
                  className="pl-11 h-12 rounded-2xl border-muted bg-muted/10 focus-visible:ring-primary focus-visible:border-primary transition-all font-mono text-lg"
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground ml-1">End Time</Label>
              <div className="relative group">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  type="time" 
                  value={earlyLeaveEndTime}
                  onChange={(e) => setEarlyLeaveEndTime(e.target.value)}
                  disabled={!isEarlyLeaveEnabled}
                  className="pl-11 h-12 rounded-2xl border-muted bg-muted/10 focus-visible:ring-primary focus-visible:border-primary transition-all font-mono text-lg"
                />
              </div>
            </div>
          </div>

          <div className="bg-warning/10 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-2xl p-4 flex gap-4">
            <AlertCircle className="w-5 h-5 text-warning dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-tight">Early Leave Protocol</p>
              <p className="text-[11px] text-warning/80 dark:text-amber-400/80 leading-relaxed font-medium">
                When enabled, early leave marking will only be allowed between {earlyLeaveStartTime} and {earlyLeaveEndTime}.
              </p>
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            Update Early Leave settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
