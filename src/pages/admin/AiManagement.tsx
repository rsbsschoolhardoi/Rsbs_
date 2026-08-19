import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, ShieldAlert, Settings, MessageSquare, Clock, Users, Save, RefreshCw, Trash2, Edit2, Play, CheckCircle2, AlertCircle, Plus, LayoutDashboard, Database, ShieldCheck, GraduationCap, Calendar, CreditCard, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/db/api';
import type { AiSettings, AiStudentConfig, AiClassConfig, AiUsage, Class, Student } from '@/types';
import ApiConfigPage from '../public/ApiConfigPage';

export default function AiManagement() {
  const [activeTab, setActiveTab] = useState('study-ai');

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8 animate-in fade-in duration-500 pb-20 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Management</h1>
          <p className="text-muted-foreground mt-1">Control and monitor the Study AI ecosystem.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="api-config" className="gap-2">
            <Database className="w-4 h-4" /> Manage API
          </TabsTrigger>
          <TabsTrigger value="study-ai" className="gap-2">
            <SparklesIcon className="w-4 h-4" /> Study AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-config">
          {/* Reuse the existing ApiConfigPage logic or embed it */}
          <ApiConfigPage />
        </TabsContent>

        <TabsContent value="study-ai" className="space-y-6">
          <StudyAiModule />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/>
      <path d="M19 17v4"/>
      <path d="M3 5h4"/>
      <path d="M17 19h4"/>
    </svg>
  );
}

function StudyAiModule() {
  const [subTab, setSubTab] = useState('manage-control');
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await api.getAiSettings();
    if (error) toast.error('Failed to load settings');
    else setSettings(data);
    setLoading(false);
  };

  const handleUpdateSettings = async (updates: Partial<AiSettings>) => {
    if (!settings) return;
    const { error } = await api.updateAiSettings(settings.id, updates);
    if (error) toast.error('Failed to update settings');
    else {
      toast.success('Settings updated');
      fetchSettings();
    }
  };

  if (loading && !settings) return <div>Loading...</div>;

  return (
    <Card className="border-muted-foreground/20 shadow-lg overflow-hidden">
      <CardHeader className="bg-muted/30 border-b">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Study AI Configuration</CardTitle>
            <CardDescription>Manage access controls, limits, and system notices.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="system-enabled" className="text-sm font-medium">System Enabled</Label>
            <Switch 
              id="system-enabled" 
              checked={settings?.is_system_enabled} 
              onCheckedChange={(checked) => handleUpdateSettings({ is_system_enabled: checked })}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={subTab} onValueChange={setSubTab} className="flex flex-col md:flex-row h-full md:min-h-[600px]">
          <TabsList className="flex flex-col h-auto w-full md:w-64 bg-muted/20 border-r rounded-none p-2 space-y-1 justify-start items-stretch">
            <TabsTrigger value="manage-control" className="justify-start gap-2 px-4 py-3 data-[state=active]:bg-background shadow-sm">
              <ShieldAlert className="w-4 h-4" /> Manage Control
            </TabsTrigger>
            <TabsTrigger value="set-limit" className="justify-start gap-2 px-4 py-3 data-[state=active]:bg-background shadow-sm">
              <Clock className="w-4 h-4" /> Set Limit
            </TabsTrigger>
            <TabsTrigger value="notice-content" className="justify-start gap-2 px-4 py-3 data-[state=active]:bg-background shadow-sm">
              <MessageSquare className="w-4 h-4" /> Notice Content
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 p-6 overflow-y-auto">
            <TabsContent value="manage-control" className="m-0 space-y-8 animate-in fade-in slide-in-from-left-2">
              <ManageControlSection settings={settings} />
            </TabsContent>

            <TabsContent value="set-limit" className="m-0 space-y-8 animate-in fade-in slide-in-from-left-2">
              <SetLimitSection settings={settings} onUpdate={handleUpdateSettings} />
            </TabsContent>

            <TabsContent value="notice-content" className="m-0 space-y-8 animate-in fade-in slide-in-from-left-2">
              <NoticeContentSection settings={settings} onUpdate={handleUpdateSettings} />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ManageControlSection({ settings }: { settings: AiSettings | null }) {
  const [studentConfigs, setStudentConfigs] = useState<AiStudentConfig[]>([]);
  const [classConfigs, setClassConfigs] = useState<AiClassConfig[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [usageData, setUsageData] = useState<AiUsage[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [sc, cc, cl, st, us] = await Promise.all([
      api.getAiStudentConfigs(),
      api.getAiClassConfigs(),
      api.getClasses(),
      api.getStudents(),
      api.getAiUsage()
    ]);
    setStudentConfigs(sc.data || []);
    setClassConfigs(cc.data || []);
    setClasses(cl.data || []);
    setStudents(st.data || []);
    setUsageData(us.data || []);
    setLoading(false);
  };

  const handleToggleStudent = async (studentId: string, enabled: boolean) => {
    const { error } = await api.upsertAiStudentConfig({ student_id: studentId, is_enabled: enabled });
    if (error) toast.error('Failed to update student config');
    else {
      toast.success('Student config updated');
      fetchData();
    }
  };

  const handleToggleClass = async (classId: string, enabled: boolean) => {
    const { error } = await api.upsertAiClassConfig({ class_id: classId, is_enabled: enabled });
    if (error) toast.error('Failed to update class config');
    else {
      toast.success('Class config updated');
      fetchData();
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.class.toLowerCase().includes(search.toLowerCase()) ||
    s.login_id.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 50);

  const [maxMessages, setMaxMessages] = useState(settings?.max_messages_per_chat || 50);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="font-bold">Chat Persistence</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-messages">Max Messages per Chat</Label>
              <div className="flex gap-2">
                <Input 
                  id="max-messages"
                  type="number"
                  value={maxMessages}
                  onChange={(e) => setMaxMessages(parseInt(e.target.value) || 1)}
                  className="h-9"
                />
                <Button 
                  size="sm" 
                  onClick={() => {
                    if (settings) {
                      api.updateAiSettings(settings.id, { max_messages_per_chat: maxMessages });
                      toast.success('Max messages limit updated');
                    }
                  }}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Automatically trims oldest messages (FIFO) when limit is reached.
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="font-bold">Data Access Permissions</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="access-grades" className="text-sm cursor-pointer">Grades & Performance</Label>
                </div>
                <Switch 
                  id="access-grades"
                  checked={settings?.access_grades_enabled || false}
                  onCheckedChange={(checked) => {
                    if (settings) {
                      api.updateAiSettings(settings.id, { access_grades_enabled: checked });
                      toast.success(`Grades access ${checked ? 'enabled' : 'disabled'}`);
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="access-attendance" className="text-sm cursor-pointer">Attendance Records</Label>
                </div>
                <Switch 
                  id="access-attendance"
                  checked={settings?.access_attendance_enabled || false}
                  onCheckedChange={(checked) => {
                    if (settings) {
                      api.updateAiSettings(settings.id, { access_attendance_enabled: checked });
                      toast.success(`Attendance access ${checked ? 'enabled' : 'disabled'}`);
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="access-exams" className="text-sm cursor-pointer">Exam Schedule</Label>
                </div>
                <Switch 
                  id="access-exams"
                  checked={settings?.access_exams_enabled || false}
                  onCheckedChange={(checked) => {
                    if (settings) {
                      api.updateAiSettings(settings.id, { access_exams_enabled: checked });
                      toast.success(`Exam schedule access ${checked ? 'enabled' : 'disabled'}`);
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="access-fees" className="text-sm cursor-pointer">Fee Status</Label>
                </div>
                <Switch 
                  id="access-fees"
                  checked={settings?.access_fees_enabled || false}
                  onCheckedChange={(checked) => {
                    if (settings) {
                      api.updateAiSettings(settings.id, { access_fees_enabled: checked });
                      toast.success(`Fee status access ${checked ? 'enabled' : 'disabled'}`);
                    }
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Strictly follow granular permissions. Sensitive data (DOB, Phone, etc.) is permanently prohibited.
            </p>
          </div>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" /> Class Access Control
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(c => {
            const config = classConfigs.find(cc => cc.class_id === c.id);
            const isEnabled = config ? config.is_enabled : true;
            return (
              <Card key={c.id} className="p-4 flex items-center justify-between border-muted">
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs text-muted-foreground font-medium">
                    {isEnabled ? 'Access Granted' : 'Access Restricted'}
                  </p>
                </div>
                <Switch 
                  checked={isEnabled} 
                  onCheckedChange={(checked) => handleToggleClass(c.id, checked)}
                />
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary" /> Student Usage & Controls
          </h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search student..." 
              className="pl-8" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold">Student</TableHead>
                <TableHead className="font-bold text-center">Class</TableHead>
                <TableHead className="font-bold text-center">Status</TableHead>
                <TableHead className="font-bold text-center">Usage Today</TableHead>
                <TableHead className="font-bold text-center">Remaining</TableHead>
                <TableHead className="font-bold text-center">Total Historical</TableHead>
                <TableHead className="font-bold text-right">Toggle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map(s => {
                const config = studentConfigs.find(sc => sc.student_id === s.id);
                const isEnabled = config ? config.is_enabled : true;
                const usage = usageData.find(u => u.student_id === s.id && u.usage_date === new Date().toISOString().split('T')[0]);
                const limit = config?.daily_limit || classConfigs.find(cc => cc.class_id === s.class_id)?.daily_limit || settings?.global_daily_limit || 50;
                
                const used = usage?.message_count || 0;
                const totalUsed = usage?.total_historical_usage || 0;

                return (
                  <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                          {s.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.login_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">{s.class}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={isEnabled ? "default" : "destructive"} className="text-xs uppercase font-bold tracking-tighter">
                        {isEnabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      <span className={used >= limit ? "text-destructive font-bold" : ""}>
                        {used}/{limit}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm">{Math.max(0, limit - used)}</TableCell>
                    <TableCell className="text-center text-sm font-medium">{totalUsed}</TableCell>
                    <TableCell className="text-right">
                      <Switch 
                        checked={isEnabled} 
                        onCheckedChange={(checked) => handleToggleStudent(s.id, checked)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function SetLimitSection({ settings, onUpdate }: { settings: AiSettings | null, onUpdate: (updates: Partial<AiSettings>) => void }) {
  const [globalLimit, setGlobalLimit] = useState(settings?.global_daily_limit || 50);
  const [resetTime, setResetTime] = useState(settings?.daily_reset_time || '00:00');
  const [classes, setClasses] = useState<Class[]>([]);
  const [classConfigs, setClassConfigs] = useState<AiClassConfig[]>([]);

  useEffect(() => {
    api.getClasses().then(res => setClasses(res.data || []));
    api.getAiClassConfigs().then(res => setClassConfigs(res.data || []));
  }, []);

  const handleUpdateClassLimit = async (classId: string, limit: number | null) => {
    const { error } = await api.upsertAiClassConfig({ class_id: classId, daily_limit: limit, is_enabled: true });
    if (error) toast.error('Failed to update class limit');
    else {
      toast.success('Class limit updated');
      api.getAiClassConfigs().then(res => setClassConfigs(res.data || []));
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Global Default Limit
            </CardTitle>
            <CardDescription>Applied to all students unless overridden.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="global-limit">Daily Message Count</Label>
              <div className="flex gap-2">
                <Input 
                  id="global-limit" 
                  type="number" 
                  value={globalLimit} 
                  onChange={(e) => setGlobalLimit(parseInt(e.target.value))}
                />
                <Button onClick={() => onUpdate({ global_daily_limit: globalLimit })}>Save</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-time">Daily Reset Time</Label>
              <div className="flex gap-2">
                <Input 
                  id="reset-time" 
                  type="time" 
                  value={resetTime} 
                  onChange={(e) => setResetTime(e.target.value)}
                />
                <Button onClick={() => onUpdate({ daily_reset_time: resetTime })}>Update</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-warning/10 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" /> Usage Policy Note
            </CardTitle>
            <CardDescription>Reset time affects all calculations. Limits are evaluated in order: Student Override {' > '} Class Override {' > '} Global Default.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground italic">
            "Setting a limit to 0 effectively disables the module for that scope. Use null/empty to revert to a higher-level setting."
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
          <LayoutDashboard className="w-5 h-5 text-primary" /> Class Limit Overrides
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(c => {
            const config = classConfigs.find(cc => cc.class_id === c.id);
            const limit = config?.daily_limit;
            return (
              <Card key={c.id} className="p-4 space-y-3 border-muted">
                <div className="flex justify-between items-center">
                  <p className="font-bold">{c.name}</p>
                  <Badge variant={limit !== undefined ? "secondary" : "outline"} className="text-xs">
                    {limit !== undefined ? 'Custom' : 'Inherited'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    placeholder={settings?.global_daily_limit?.toString()}
                    value={limit ?? ''}
                    onChange={(e) => handleUpdateClassLimit(c.id, e.target.value ? parseInt(e.target.value) : null)}
                    className="h-8 text-sm"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NoticeContentSection({ settings, onUpdate }: { settings: AiSettings | null, onUpdate: (updates: Partial<AiSettings>) => void }) {
  const [formState, setFormState] = useState({
    limit_reached_message: settings?.limit_reached_message || '',
    warning_message: settings?.warning_message || '',
    reset_info_message: settings?.reset_info_message || '',
    individual_disabled_message: settings?.individual_disabled_message || '',
    class_disabled_message: settings?.class_disabled_message || '',
    system_unavailable_message: settings?.system_unavailable_message || '',
  });

  const handleSave = () => {
    onUpdate(formState);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <Label className="text-sm font-bold flex items-center gap-2">
             Limit Reached Message
          </Label>
          <Textarea 
            value={formState.limit_reached_message} 
            onChange={(e) => setFormState(prev => ({ ...prev, limit_reached_message: e.target.value }))}
            placeholder="What to show when student runs out of messages..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold flex items-center gap-2">
             Warning Message (Inappropriate Content)
          </Label>
          <Textarea 
            value={formState.warning_message} 
            onChange={(e) => setFormState(prev => ({ ...prev, warning_message: e.target.value }))}
            placeholder="Shown when system flags a question..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold flex items-center gap-2">
             Reset Info Message
          </Label>
          <Textarea 
            value={formState.reset_info_message} 
            onChange={(e) => setFormState(prev => ({ ...prev, reset_info_message: e.target.value }))}
            placeholder="Instruction on when the limit resets..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          <div className="space-y-2">
            <Label className="text-sm font-bold">Individual Disabled Message</Label>
            <Textarea 
              value={formState.individual_disabled_message} 
              onChange={(e) => setFormState(prev => ({ ...prev, individual_disabled_message: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold">Class Disabled Message</Label>
            <Textarea 
              value={formState.class_disabled_message} 
              onChange={(e) => setFormState(prev => ({ ...prev, class_disabled_message: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">System Unavailable Message</Label>
          <Textarea 
            value={formState.system_unavailable_message} 
            onChange={(e) => setFormState(prev => ({ ...prev, system_unavailable_message: e.target.value }))}
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" /> Save Notice Templates
        </Button>
      </div>
    </div>
  );
}
