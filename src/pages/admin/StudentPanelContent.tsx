import React, { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, GripVertical, Settings, Bell, HelpCircle, ShieldCheck } from 'lucide-react';
import type {
  StudentPanelSetting,
  StudentPanelNotification,
  StudentPanelHelpSupport,
  StudentPanelPrivacyPolicy,
} from '@/types';

const SETTINGS_TYPES = ['toggle', 'select', 'text'] as const;
const NOTIFICATION_CHANNELS = ['push', 'email', 'sms'] as const;

export default function StudentPanelContent() {
  const [activeTab, setActiveTab] = useState('settings');

  const [settings, setSettings] = useState<StudentPanelSetting[]>([]);
  const [notifications, setNotifications] = useState<StudentPanelNotification[]>([]);
  const [help, setHelp] = useState<StudentPanelHelpSupport[]>([]);
  const [privacy, setPrivacy] = useState<StudentPanelPrivacyPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const [settingDialog, setSettingDialog] = useState<{
    open: boolean;
    item: Partial<StudentPanelSetting> | null;
  }>({ open: false, item: null });

  const [notificationDialog, setNotificationDialog] = useState<{
    open: boolean;
    item: Partial<StudentPanelNotification> | null;
  }>({ open: false, item: null });

  const [helpDialog, setHelpDialog] = useState<{
    open: boolean;
    item: Partial<StudentPanelHelpSupport> | null;
  }>({ open: false, item: null });

  const [privacyDialog, setPrivacyDialog] = useState<{
    open: boolean;
    item: Partial<StudentPanelPrivacyPolicy> | null;
  }>({ open: false, item: null });

  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'setting' | 'notification' | 'help' | 'privacy';
    id: string;
  } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [
      { data: s },
      { data: n },
      { data: h },
      { data: p },
    ] = await Promise.all([
      api.getStudentPanelSettings(undefined, false),
      api.getStudentPanelNotifications(undefined, false),
      api.getStudentPanelHelpSupport(undefined, false),
      api.getStudentPanelPrivacyPolicy(undefined, false),
    ]);
    setSettings(s || []);
    setNotifications(n || []);
    setHelp(h || []);
    setPrivacy(p || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    let error: any;
    switch (type) {
      case 'setting':
        ({ error } = await api.deleteStudentPanelSetting(id));
        break;
      case 'notification':
        ({ error } = await api.deleteStudentPanelNotification(id));
        break;
      case 'help':
        ({ error } = await api.deleteStudentPanelHelpSupport(id));
        break;
      case 'privacy':
        ({ error } = await api.deleteStudentPanelPrivacyPolicy(id));
        break;
    }
    if (error) {
      toast.error('Failed to delete item', { description: error.message });
    } else {
      toast.success('Item deleted');
      fetchAll();
    }
    setDeleteTarget(null);
  };

  const saveSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = settingDialog.item;
    if (!item?.key || !item?.label || !item?.type) return;
    const payload: Partial<StudentPanelSetting> = {
      id: item.id,
      key: item.key,
      label: item.label,
      description: item.description || '',
      type: item.type as StudentPanelSetting['type'],
      value: item.value ?? '',
      options: Array.isArray(item.options) ? item.options : (item.options ? String(item.options).split(',').map((s) => s.trim()) : []),
      is_active: item.is_active ?? true,
      sort_order: item.sort_order ?? 0,
    };
    const { error } = await api.upsertStudentPanelSetting(payload);
    if (error) {
      toast.error('Failed to save setting', { description: error.message });
      return;
    }
    toast.success('Setting saved');
    setSettingDialog({ open: false, item: null });
    fetchAll();
  };

  const saveNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = notificationDialog.item;
    if (!item?.key || !item?.label || !item?.channel) return;
    const payload: Partial<StudentPanelNotification> = {
      id: item.id,
      key: item.key,
      label: item.label,
      description: item.description || '',
      channel: item.channel as StudentPanelNotification['channel'],
      is_active: item.is_active ?? true,
      sort_order: item.sort_order ?? 0,
    };
    const { error } = await api.upsertStudentPanelNotification(payload);
    if (error) {
      toast.error('Failed to save notification', { description: error.message });
      return;
    }
    toast.success('Notification saved');
    setNotificationDialog({ open: false, item: null });
    fetchAll();
  };

  const saveHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = helpDialog.item;
    if (!item?.title || !item?.content) return;
    const payload: Partial<StudentPanelHelpSupport> = {
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category || '',
      contact_email: item.contact_email || '',
      contact_phone: item.contact_phone || '',
      is_active: item.is_active ?? true,
      sort_order: item.sort_order ?? 0,
    };
    const { error } = await api.upsertStudentPanelHelpSupport(payload);
    if (error) {
      toast.error('Failed to save help article', { description: error.message });
      return;
    }
    toast.success('Help article saved');
    setHelpDialog({ open: false, item: null });
    fetchAll();
  };

  const savePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = privacyDialog.item;
    if (!item?.title || !item?.content) return;
    const payload: Partial<StudentPanelPrivacyPolicy> = {
      id: item.id,
      title: item.title,
      content: item.content,
      version: item.version || '1.0',
      effective_date: item.effective_date || new Date().toISOString().split('T')[0],
      is_active: item.is_active ?? true,
    };
    const { error } = await api.upsertStudentPanelPrivacyPolicy(payload);
    if (error) {
      toast.error('Failed to save privacy policy', { description: error.message });
      return;
    }
    toast.success('Privacy policy saved');
    setPrivacyDialog({ open: false, item: null });
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Student Panel Content</h1>
        <p className="text-sm text-muted-foreground">
          Customize settings, notifications, help articles and privacy policy shown in the Student Panel.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" /> Settings
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="help" className="gap-2">
            <HelpCircle className="w-4 h-4" /> Help & Support
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <ShieldCheck className="w-4 h-4" /> Privacy Policy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Manage toggles, selects and text options in Account & Settings.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setSettingDialog({ open: true, item: { type: 'toggle', value: 'true', is_active: true, sort_order: settings.length } })}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {settings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No settings configured yet.</p>
              ) : (
                settings.sort((a, b) => a.sort_order - b.sort_order).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{s.label}</p>
                        <Badge variant="outline" className="text-xs">{s.type}</Badge>
                        {!s.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{s.key}</p>
                      {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => setSettingDialog({ open: true, item: { ...s } })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget({ type: 'setting', id: s.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Define notification preferences students can enable.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setNotificationDialog({ open: true, item: { channel: 'push', is_active: true, sort_order: notifications.length } })}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notification preferences configured.</p>
              ) : (
                notifications.sort((a, b) => a.sort_order - b.sort_order).map((n) => (
                  <div key={n.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{n.label}</p>
                        <Badge variant="outline" className="text-xs">{n.channel}</Badge>
                        {!n.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{n.key}</p>
                      {n.description && <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => setNotificationDialog({ open: true, item: { ...n } })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget({ type: 'notification', id: n.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Help & Support</CardTitle>
                <CardDescription>Manage support articles and contact information.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setHelpDialog({ open: true, item: { is_active: true, sort_order: help.length } })}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {help.length === 0 ? (
                <p className="text-sm text-muted-foreground">No help articles configured.</p>
              ) : (
                help.sort((a, b) => a.sort_order - b.sort_order).map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{h.title}</p>
                        {h.category && <Badge variant="outline" className="text-xs">{h.category}</Badge>}
                        {!h.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </div>
                      {(h.contact_email || h.contact_phone) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {h.contact_email} {h.contact_phone && `• ${h.contact_phone}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => setHelpDialog({ open: true, item: { ...h } })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget({ type: 'help', id: h.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Privacy Policy</CardTitle>
                <CardDescription>Manage privacy policy versions shown to students.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setPrivacyDialog({ open: true, item: { is_active: true, version: '1.0', effective_date: new Date().toISOString().split('T')[0] } })}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {privacy.length === 0 ? (
                <p className="text-sm text-muted-foreground">No privacy policy configured.</p>
              ) : (
                privacy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{p.title}</p>
                        <Badge variant="outline" className="text-xs">v{p.version}</Badge>
                        {!p.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Effective {new Date(p.effective_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => setPrivacyDialog({ open: true, item: { ...p } })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget({ type: 'privacy', id: p.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Setting Dialog */}
      <Dialog open={settingDialog.open} onOpenChange={(o) => !o && setSettingDialog({ open: false, item: null })}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{settingDialog.item?.id ? 'Edit Setting' : 'Add Setting'}</DialogTitle>
            <DialogDescription>Configure a student-facing setting.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveSetting} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Key</Label>
                <Input value={settingDialog.item?.key || ''} onChange={(e) => setSettingDialog({ ...settingDialog, item: { ...settingDialog.item!, key: e.target.value } })} placeholder="e.g. dark_mode" />
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input value={settingDialog.item?.label || ''} onChange={(e) => setSettingDialog({ ...settingDialog, item: { ...settingDialog.item!, label: e.target.value } })} placeholder="e.g. Dark Mode" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={settingDialog.item?.description || ''} onChange={(e) => setSettingDialog({ ...settingDialog, item: { ...settingDialog.item!, description: e.target.value } })} placeholder="Short description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={settingDialog.item?.type || 'toggle'}
                  onChange={(e) => setSettingDialog({ ...settingDialog, item: { ...settingDialog.item!, type: e.target.value as any } })}
                >
                  {SETTINGS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Default Value</Label>
                <Input value={String(settingDialog.item?.value ?? '')} onChange={(e) => setSettingDialog({ ...settingDialog, item: { ...settingDialog.item!, value: e.target.value } })} placeholder="true / option1" />
              </div>
            </div>
            {settingDialog.item?.type === 'select' && (
              <div className="space-y-2">
                <Label>Options (comma separated)</Label>
                <Input value={Array.isArray(settingDialog.item?.options) ? settingDialog.item.options.join(', ') : settingDialog.item?.options || ''} onChange={(e) => setSettingDialog({ ...settingDialog, item: { ...settingDialog.item!, options: e.target.value.split(',').map((s) => s.trim()) } })} placeholder="Option 1, Option 2" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={settingDialog.item?.sort_order ?? 0} onChange={(e) => setSettingDialog({ ...settingDialog, item: { ...settingDialog.item!, sort_order: Number(e.target.value) } })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={settingDialog.item?.is_active ?? true} onCheckedChange={(v) => setSettingDialog({ ...settingDialog, item: { ...settingDialog.item!, is_active: v } })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSettingDialog({ open: false, item: null })}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={notificationDialog.open} onOpenChange={(o) => !o && setNotificationDialog({ open: false, item: null })}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{notificationDialog.item?.id ? 'Edit Notification' : 'Add Notification'}</DialogTitle>
            <DialogDescription>Configure a student notification preference.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveNotification} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Key</Label>
                <Input value={notificationDialog.item?.key || ''} onChange={(e) => setNotificationDialog({ ...notificationDialog, item: { ...notificationDialog.item!, key: e.target.value } })} placeholder="e.g. fee_reminder" />
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input value={notificationDialog.item?.label || ''} onChange={(e) => setNotificationDialog({ ...notificationDialog, item: { ...notificationDialog.item!, label: e.target.value } })} placeholder="e.g. Fee Reminders" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={notificationDialog.item?.description || ''} onChange={(e) => setNotificationDialog({ ...notificationDialog, item: { ...notificationDialog.item!, description: e.target.value } })} placeholder="Short description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Channel</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={notificationDialog.item?.channel || 'push'}
                  onChange={(e) => setNotificationDialog({ ...notificationDialog, item: { ...notificationDialog.item!, channel: e.target.value as any } })}
                >
                  {NOTIFICATION_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={notificationDialog.item?.sort_order ?? 0} onChange={(e) => setNotificationDialog({ ...notificationDialog, item: { ...notificationDialog.item!, sort_order: Number(e.target.value) } })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={notificationDialog.item?.is_active ?? true} onCheckedChange={(v) => setNotificationDialog({ ...notificationDialog, item: { ...notificationDialog.item!, is_active: v } })} />
              <Label>Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNotificationDialog({ open: false, item: null })}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={helpDialog.open} onOpenChange={(o) => !o && setHelpDialog({ open: false, item: null })}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{helpDialog.item?.id ? 'Edit Help Article' : 'Add Help Article'}</DialogTitle>
            <DialogDescription>Configure support content and contacts.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveHelp} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={helpDialog.item?.title || ''} onChange={(e) => setHelpDialog({ ...helpDialog, item: { ...helpDialog.item!, title: e.target.value } })} placeholder="e.g. How to reset PIN" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={helpDialog.item?.category || ''} onChange={(e) => setHelpDialog({ ...helpDialog, item: { ...helpDialog.item!, category: e.target.value } })} placeholder="e.g. Account" />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={helpDialog.item?.sort_order ?? 0} onChange={(e) => setHelpDialog({ ...helpDialog, item: { ...helpDialog.item!, sort_order: Number(e.target.value) } })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input type="email" value={helpDialog.item?.contact_email || ''} onChange={(e) => setHelpDialog({ ...helpDialog, item: { ...helpDialog.item!, contact_email: e.target.value } })} placeholder="support@school.com" />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input value={helpDialog.item?.contact_phone || ''} onChange={(e) => setHelpDialog({ ...helpDialog, item: { ...helpDialog.item!, contact_phone: e.target.value } })} placeholder="+91 ..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={helpDialog.item?.content || ''} onChange={(e) => setHelpDialog({ ...helpDialog, item: { ...helpDialog.item!, content: e.target.value } })} placeholder="Article content..." rows={6} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={helpDialog.item?.is_active ?? true} onCheckedChange={(v) => setHelpDialog({ ...helpDialog, item: { ...helpDialog.item!, is_active: v } })} />
              <Label>Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setHelpDialog({ open: false, item: null })}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Privacy Dialog */}
      <Dialog open={privacyDialog.open} onOpenChange={(o) => !o && setPrivacyDialog({ open: false, item: null })}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{privacyDialog.item?.id ? 'Edit Privacy Policy' : 'Add Privacy Policy'}</DialogTitle>
            <DialogDescription>Configure a privacy policy version.</DialogDescription>
          </DialogHeader>
          <form onSubmit={savePrivacy} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={privacyDialog.item?.title || ''} onChange={(e) => setPrivacyDialog({ ...privacyDialog, item: { ...privacyDialog.item!, title: e.target.value } })} placeholder="Privacy Policy" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Version</Label>
                <Input value={privacyDialog.item?.version || ''} onChange={(e) => setPrivacyDialog({ ...privacyDialog, item: { ...privacyDialog.item!, version: e.target.value } })} placeholder="1.0" />
              </div>
              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input type="date" value={privacyDialog.item?.effective_date || ''} onChange={(e) => setPrivacyDialog({ ...privacyDialog, item: { ...privacyDialog.item!, effective_date: e.target.value } })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={privacyDialog.item?.content || ''} onChange={(e) => setPrivacyDialog({ ...privacyDialog, item: { ...privacyDialog.item!, content: e.target.value } })} placeholder="Privacy policy content..." rows={8} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={privacyDialog.item?.is_active ?? true} onCheckedChange={(v) => setPrivacyDialog({ ...privacyDialog, item: { ...privacyDialog.item!, is_active: v } })} />
              <Label>Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPrivacyDialog({ open: false, item: null })}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete item?</DialogTitle>
            <DialogDescription>This action cannot be undone. The item will stop appearing in the Student Panel.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
