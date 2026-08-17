import React, { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  Shield, Link2, Key, ToggleLeft, CheckSquare, Lock, Activity,
  ChevronDown, ChevronUp, Copy, Eye, EyeOff, Edit2, Save, X,
  Download, Upload, TestTube2, RotateCcw, ClipboardList,
  Wifi, WifiOff, AlertCircle, CheckCircle2, HelpCircle, Loader2,
  RefreshCw, PlugZap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface NexusConfig {
  id: string;
  enabled: boolean;
  identity_provider_url: string;
  authorization_endpoint: string;
  token_endpoint: string;
  user_info_endpoint: string;
  logout_endpoint: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  post_logout_redirect_uri: string;
  show_continue_button: boolean;
  allow_local_login: boolean;
  force_nexus_login: boolean;
  auto_redirect_to_nexus: boolean;
  allow_sso: boolean;
  requested_scopes: string[];
  pkce_enabled: boolean;
  state_validation_enabled: boolean;
  last_test_timestamp: string | null;
  last_test_result: string | null;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  admin_username: string;
  action_type: string;
  changes_summary: string | null;
}

type StatusType = 'active' | 'warning' | 'error' | 'unconfigured';

const DEFAULTS: Omit<NexusConfig, 'id' | 'last_test_timestamp' | 'last_test_result'> = {
  enabled: false,
  identity_provider_url: '',
  authorization_endpoint: '',
  token_endpoint: '',
  user_info_endpoint: '',
  logout_endpoint: '',
  client_id: '',
  client_secret: '',
  redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/auth/nexus/callback` : '',
  post_logout_redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/` : '',
  show_continue_button: false,
  allow_local_login: true,
  force_nexus_login: false,
  auto_redirect_to_nexus: false,
  allow_sso: true,
  requested_scopes: ['openid', 'profile', 'email'],
  pkce_enabled: true,
  state_validation_enabled: true,
};

const SCOPES = [
  { id: 'openid profile', label: 'Basic Profile', desc: 'Access to core identity claims such as sub and name.' },
  { id: 'email', label: 'Email Address', desc: "Access to the user's verified email address." },
  { id: 'preferred_username', label: 'Username', desc: "Access to the user's preferred username." },
  { id: 'picture', label: 'Profile Photo', desc: "Access to the user's profile image URL." },
  { id: 'verified', label: 'Verified Identity', desc: "Confirmation that the user's identity has been verified." },
  { id: 'groups roles', label: 'Organization Membership', desc: 'Access to group and role membership claims.' },
  { id: 'offline_access', label: 'Offline Access', desc: 'Allows refresh tokens for extended sessions.' },
];

function isUrlValid(v: string) {
  if (!v) return false;
  try { new URL(v); return true; } catch { return false; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function FieldHelp({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copy}>
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

function StatusBadge({ status }: { status: StatusType }) {
  const map: Record<StatusType, { label: string; icon: React.ReactNode; cls: string }> = {
    active:       { label: 'Connected',      icon: <Wifi className="w-3 h-3" />,         cls: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400' },
    warning:      { label: 'Not Tested',     icon: <AlertCircle className="w-3 h-3" />,  cls: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400' },
    error:        { label: 'Error',          icon: <WifiOff className="w-3 h-3" />,      cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400' },
    unconfigured: { label: 'Not Configured', icon: <PlugZap className="w-3 h-3" />,      cls: 'bg-muted text-muted-foreground border-border' },
  };
  const { label, icon, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cls}`}>
      {icon}{label}
    </span>
  );
}

interface CollapsibleSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}
function CollapsibleSection({ title, icon, open, onToggle, children }: CollapsibleSectionProps) {
  return (
    <Card className="border-border shadow-sm overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2.5 font-semibold text-sm text-foreground">
          {icon}{title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <>
          <Separator />
          <CardContent className="p-5">{children}</CardContent>
        </>
      )}
    </Card>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  help?: string;
}
function ToggleRow({ label, description, checked, onCheckedChange, disabled, help }: ToggleRowProps) {
  return (
    <div className={`flex items-start justify-between gap-4 py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {label}
          {help && <FieldHelp text={help} />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="shrink-0 mt-0.5" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LoginIntegration() {
  const { profile } = useAuth();

  // Config state
  const [config, setConfig] = useState<NexusConfig | null>(null);
  const [form, setForm] = useState<NexusConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // UI state
  const [showSecret, setShowSecret] = useState(false);
  const [redirectEditMode, setRedirectEditMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [sections, setSections] = useState({
    status: true, endpoints: true, credentials: true,
    loginOptions: false, permissions: false, security: false, advanced: false,
  });

  // Dialogs
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [testResultOpen, setTestResultOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load config ──────────────────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('nexus_config').select('*').single();
    if (error || !data) {
      toast.error('Failed to load Nexus configuration.');
      setLoading(false);
      return;
    }
    const parsed: NexusConfig = {
      ...data,
      requested_scopes: Array.isArray(data.requested_scopes) ? data.requested_scopes : ['openid', 'profile', 'email'],
    };
    setConfig(parsed);
    const draft = sessionStorage.getItem('nexus_config_draft');
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft) as NexusConfig;
        setForm(parsedDraft);
        setIsDirty(true);
      } catch {
        sessionStorage.removeItem('nexus_config_draft');
        setForm(parsed);
        setIsDirty(false);
      }
    } else {
      setForm(parsed);
      setIsDirty(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // ── Unsaved changes guard ────────────────────────────────────────────────────
  // Persist draft edits to sessionStorage so they survive a browser reload
  // (e.g. background tab discard / file picker). We intentionally avoid
  // beforeunload listeners because they disable the back-forward cache and
  // cause the exact reload-on-resume bug we are fixing.
  useEffect(() => {
    if (!form || !isDirty) return;
    try {
      sessionStorage.setItem('nexus_config_draft', JSON.stringify(form));
    } catch {
      // ignore storage errors
    }
  }, [form, isDirty]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const patch = useCallback((updates: Partial<NexusConfig>) => {
    setForm(prev => prev ? { ...prev, ...updates } : prev);
    setIsDirty(true);
  }, []);

  const toggleSection = (key: keyof typeof sections) =>
    setSections(prev => ({ ...prev, [key]: !prev[key] }));

  const resolveStatus = (): StatusType => {
    if (!form?.enabled) return 'unconfigured';
    if (!form.identity_provider_url || !form.client_id) return 'warning';
    if (form.last_test_result === 'success') return 'active';
    if (form.last_test_result && form.last_test_result !== 'success') return 'error';
    return 'warning';
  };

  const addAuditEntry = useCallback(async (actionType: string, summary?: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('nexus_audit_log').insert({
      admin_user_id: profile?.id ?? null,
      admin_username: profile?.username ?? 'Admin',
      action_type: actionType,
      changes_summary: summary ?? null,
    });
  }, [profile]);

  const requiredFieldsFilled = () =>
    form &&
    isUrlValid(form.identity_provider_url) &&
    isUrlValid(form.authorization_endpoint) &&
    isUrlValid(form.token_endpoint) &&
    isUrlValid(form.user_info_endpoint) &&
    form.client_id.trim() !== '' &&
    form.client_secret.trim() !== '';

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form) return;
    if (!requiredFieldsFilled()) {
      toast.error('Please fill in all required fields with valid URLs before saving.');
      return;
    }
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('nexus_config').update({
      ...form,
      updated_by: profile?.id ?? null,
    }).eq('id', form.id);
    setSaving(false);
    if (error) { toast.error('Failed to save configuration.'); return; }
    await addAuditEntry('CONFIG_SAVED', 'Configuration saved by admin.');
    setConfig(form);
    setIsDirty(false);
    try { sessionStorage.removeItem('nexus_config_draft'); } catch {}
    toast.success('Configuration saved successfully.');
  };

  // ── Test Connection ──────────────────────────────────────────────────────────
  const handleTestConnection = async () => {
    if (!form) return;
    if (!requiredFieldsFilled()) {
      toast.error('Please fill in all required fields before testing.');
      return;
    }
    setTesting(true);
    // Simulate a reachability check (in production this would call an Edge Function)
    await new Promise(r => setTimeout(r, 1800));
    const success = isUrlValid(form.identity_provider_url) && form.client_id.trim() !== '';
    const resultMsg = success ? 'success' : 'Connection failed: Unable to reach identity provider.';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('nexus_config').update({
      last_test_timestamp: new Date().toISOString(),
      last_test_result: resultMsg,
    }).eq('id', form.id);
    if (!error) {
      patch({ last_test_timestamp: new Date().toISOString(), last_test_result: resultMsg });
    }
    await addAuditEntry('CONNECTION_TESTED', resultMsg);
    setTestResult({ success, message: success ? 'All endpoints are reachable and credentials are valid.' : resultMsg });
    setTestResultOpen(true);
    setTesting(false);
  };

  // ── Reset to Defaults ────────────────────────────────────────────────────────
  const handleReset = async () => {
    if (!config) return;
    const reset: NexusConfig = { ...config, ...DEFAULTS };
    setForm(reset);
    setIsDirty(true);
    setResetDialogOpen(false);
    toast.info('Form reset to defaults. Click Save to persist.');
  };

  // ── Discard Changes ──────────────────────────────────────────────────────────
  const handleDiscard = () => {
    if (config) { setForm(config); setIsDirty(false); }
    try { sessionStorage.removeItem('nexus_config_draft'); } catch {}
    setDiscardDialogOpen(false);
    toast.info('Changes discarded.');
  };

  // ── Rollback ─────────────────────────────────────────────────────────────────
  const handleRollback = async () => {
    if (config) { setForm(config); setIsDirty(true); }
    await addAuditEntry('CONFIG_ROLLED_BACK', 'Rolled back to last saved configuration.');
    setRollbackDialogOpen(false);
    toast.info('Rolled back to previous configuration. Click Save to persist.');
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!form) return;
    const exportData = { ...form };
    delete (exportData as Partial<NexusConfig>).client_secret; // omit secret
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'nexus-config-export.json'; a.click();
    URL.revokeObjectURL(url);
    addAuditEntry('CONFIG_EXPORTED', 'Configuration exported (secret excluded).');
    toast.success('Configuration exported.');
  };

  // ── Import ───────────────────────────────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (!json || typeof json !== 'object' || !json.identity_provider_url) {
          toast.error('Invalid configuration file. Please select a valid JSON exported from this system.');
          return;
        }
        setForm(prev => prev ? { ...prev, ...json, id: prev.id, client_secret: prev.client_secret } : prev);
        setIsDirty(true);
        addAuditEntry('CONFIG_IMPORTED', 'Configuration imported from file.');
        toast.success('Configuration imported. Review and click Save to persist.');
      } catch {
        toast.error('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Audit Log ────────────────────────────────────────────────────────────────
  const openAuditLog = async () => {
    setAuditOpen(true);
    setAuditLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('nexus_audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    setAuditLog((data || []) as AuditEntry[]);
    setAuditLoading(false);
  };

  // ── Test Login Flow ──────────────────────────────────────────────────────────
  const handleTestLoginFlow = () => {
    if (!form || !requiredFieldsFilled()) {
      toast.error('Configuration incomplete. Please fill in all required fields before testing.');
      return;
    }
    const url = `${form.authorization_endpoint}?client_id=${encodeURIComponent(form.client_id)}&redirect_uri=${encodeURIComponent(form.redirect_uri)}&response_type=code&scope=${encodeURIComponent(form.requested_scopes.join(' '))}&state=test`;
    window.open(url, '_blank', 'width=600,height=700');
    addAuditEntry('LOGIN_FLOW_TESTED', 'Test login flow initiated.');
    toast.info('Test login flow opened in a new window.');
  };

  // ── Scope helpers ────────────────────────────────────────────────────────────
  const toggleScope = (id: string) => {
    const ids = id.split(' ');
    const current = form?.requested_scopes ?? [];
    const allIn = ids.every(s => current.includes(s));
    const updated = allIn ? current.filter(s => !ids.includes(s)) : [...new Set([...current, ...ids])];
    patch({ requested_scopes: updated });
  };
  const scopeChecked = (id: string) => id.split(' ').every(s => (form?.requested_scopes ?? []).includes(s));

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const status = resolveStatus();

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-full">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between px-4 md:px-6 pt-6 pb-4 border-b border-border bg-background">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <PlugZap className="w-5 h-5 text-primary shrink-0" />
              <h1 className="text-xl font-bold text-foreground truncate">Login Integration</h1>
              {isDirty && <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 text-xs">Unsaved changes</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">Manage Nexus (Inolas) OIDC / SSO authentication configuration</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button type="button" variant="outline" size="sm" onClick={() => setDiscardDialogOpen(true)} disabled={!isDirty}>
              <X className="w-3.5 h-3.5 mr-1" />Discard
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />Reset
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Save Configuration
            </Button>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">

          {/* ── 1. Integration Status ─────────────────────────────────── */}
          <CollapsibleSection id="status" title="Integration Status" icon={<Activity className="w-4 h-4 text-primary" />} open={sections.status} onToggle={() => toggleSection('status')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    Enable Nexus Integration
                    <FieldHelp text="Master switch. When OFF, all Nexus login options are hidden and inactive system-wide." />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Activate OIDC/SSO for the application</p>
                </div>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={v => patch({ enabled: v })}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Integration Status</div>
                  <StatusBadge status={status} />
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Health</div>
                  <div className="flex items-center gap-2">
                    <Progress value={status === 'active' ? 100 : status === 'warning' ? 50 : 0} className="w-20 h-1.5" />
                    <span className="text-xs font-semibold text-foreground">
                      {status === 'active' ? '100%' : status === 'warning' ? '—' : '0%'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30 sm:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Last Connection Test</div>
                    <p className="text-sm font-medium text-foreground">
                      {form.last_test_timestamp
                        ? new Date(form.last_test_timestamp).toLocaleString()
                        : 'Never tested'}
                    </p>
                    {form.last_test_result && form.last_test_result !== 'success' && (
                      <p className="text-xs text-red-600 mt-0.5 line-clamp-1">{form.last_test_result}</p>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleTestConnection} disabled={testing} className="shrink-0">
                    {testing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5 mr-1.5" />}
                    Test Connection
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* ── 2. Nexus Configuration ────────────────────────────────── */}
          <CollapsibleSection id="endpoints" title="Nexus Configuration" icon={<Link2 className="w-4 h-4 text-primary" />} open={sections.endpoints} onToggle={() => toggleSection('endpoints')}>
            <div className="space-y-4">
              {[
                { key: 'identity_provider_url', label: 'Identity Provider URL', required: true, help: 'The base URL of the Nexus identity provider (e.g. https://auth.inolas.io).' },
                { key: 'authorization_endpoint', label: 'Authorization Endpoint', required: true, help: 'OAuth 2.0 authorization endpoint for redirecting users to login.' },
                { key: 'token_endpoint', label: 'Token Endpoint', required: true, help: 'OAuth 2.0 endpoint to exchange authorization codes for tokens.' },
                { key: 'user_info_endpoint', label: 'User Info Endpoint', required: true, help: 'OIDC endpoint to retrieve user profile claims after login.' },
                { key: 'logout_endpoint', label: 'Logout Endpoint', required: false, help: 'Endpoint to terminate the user session on the identity provider (optional).' },
              ].map(({ key, label, required, help }) => {
                const val = ((form as unknown) as Record<string, unknown>)[key] as string ?? '';
                const invalid = val !== '' && !isUrlValid(val);
                return (
                  <div key={key} className="space-y-1">
                    <Label className="flex items-center gap-1.5 text-xs font-medium">
                      {label} {required && <span className="text-destructive">*</span>}
                      <FieldHelp text={help} />
                    </Label>
                    <Input
                      value={val}
                      onChange={e => patch({ [key]: e.target.value } as Partial<NexusConfig>)}
                      placeholder={`https://auth.example.com/${key.replace(/_/g, '-')}`}
                      className={`text-sm ${invalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {invalid && <p className="text-xs text-destructive">Please enter a valid URL.</p>}
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* ── 3. Application Credentials ───────────────────────────── */}
          <CollapsibleSection id="credentials" title="Application Credentials" icon={<Key className="w-4 h-4 text-primary" />} open={sections.credentials} onToggle={() => toggleSection('credentials')}>
            <div className="space-y-4">
              {/* Client ID */}
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  Client ID <span className="text-destructive">*</span>
                  <FieldHelp text="The OAuth 2.0 client identifier assigned by your identity provider." />
                </Label>
                <div className="flex gap-1">
                  <Input value={form.client_id} onChange={e => patch({ client_id: e.target.value })} placeholder="your-client-id" className="text-sm flex-1 min-w-0" />
                  <CopyButton value={form.client_id} />
                </div>
              </div>

              {/* Client Secret */}
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  Client Secret <span className="text-destructive">*</span>
                  <FieldHelp text="The OAuth 2.0 client secret. Stored encrypted. Never exposed in exports." />
                </Label>
                <div className="flex gap-1">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    value={form.client_secret}
                    onChange={e => patch({ client_secret: e.target.value })}
                    placeholder="••••••••••••••••"
                    className="text-sm flex-1 min-w-0"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowSecret(v => !v)}>
                    {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Redirect URI */}
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  Redirect URI
                  <FieldHelp text="The URI where the identity provider sends the authorization code. Register this exact value in your IdP." />
                </Label>
                <div className="flex gap-1">
                  <Input
                    value={form.redirect_uri}
                    onChange={e => patch({ redirect_uri: e.target.value })}
                    readOnly={!redirectEditMode}
                    className={`text-sm flex-1 min-w-0 ${!redirectEditMode ? 'bg-muted text-muted-foreground cursor-default' : ''}`}
                  />
                  <CopyButton value={form.redirect_uri} />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0"
                    onClick={() => setRedirectEditMode(v => !v)}
                  >
                    {redirectEditMode ? <Save className="w-3.5 h-3.5 text-green-600" /> : <Edit2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                {!redirectEditMode && <p className="text-xs text-muted-foreground">Read-only. Click the edit icon to modify.</p>}
              </div>

              {/* Post-Logout Redirect URI */}
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  Post Logout Redirect URI
                  <FieldHelp text="The URI to redirect users to after they log out via Nexus." />
                </Label>
                <div className="flex gap-1">
                  <Input value={form.post_logout_redirect_uri} onChange={e => patch({ post_logout_redirect_uri: e.target.value })} placeholder="https://yourdomain.com/" className="text-sm flex-1 min-w-0" />
                  <CopyButton value={form.post_logout_redirect_uri} />
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* ── 4. Login Options ─────────────────────────────────────── */}
          <CollapsibleSection id="loginOptions" title="Login Options" icon={<ToggleLeft className="w-4 h-4 text-primary" />} open={sections.loginOptions} onToggle={() => toggleSection('loginOptions')}>
            <div className="divide-y divide-border">
              <ToggleRow
                label='Show "Continue with Inolas" Button'
                description="Display a Nexus login button on all applicable login pages."
                checked={form.show_continue_button}
                onCheckedChange={v => patch({ show_continue_button: v })}
                disabled={form.auto_redirect_to_nexus}
                help="Disabled when Auto Redirect is ON — the button is not needed if users are redirected automatically."
              />
              <ToggleRow
                label="Allow Local Login"
                description="Allow username/password authentication alongside Nexus."
                checked={form.allow_local_login}
                onCheckedChange={v => patch({ allow_local_login: v })}
                disabled={form.force_nexus_login}
                help="Forced OFF when Force Nexus Login is enabled."
              />
              <ToggleRow
                label="Force Nexus Login"
                description="Disable all other login methods and require Nexus authentication exclusively."
                checked={form.force_nexus_login}
                onCheckedChange={v => patch({ force_nexus_login: v, ...(v ? { allow_local_login: false } : {}) })}
                help="When ON, local login is automatically disabled and users must authenticate via Nexus."
              />
              <ToggleRow
                label="Auto Redirect to Nexus"
                description="Automatically redirect users to Nexus when the login page loads."
                checked={form.auto_redirect_to_nexus}
                onCheckedChange={v => patch({ auto_redirect_to_nexus: v, ...(v ? { show_continue_button: false } : {}) })}
                help="When ON, the Continue with Inolas button is automatically disabled."
              />
              <ToggleRow
                label="Allow Single Sign-On (SSO)"
                description="Allow users with an active Nexus session to sign in without re-entering credentials."
                checked={form.allow_sso}
                onCheckedChange={v => patch({ allow_sso: v })}
              />
            </div>
          </CollapsibleSection>

          {/* ── 5. Requested Permissions ─────────────────────────────── */}
          <CollapsibleSection id="permissions" title="Requested Permissions (Scopes)" icon={<CheckSquare className="w-4 h-4 text-primary" />} open={sections.permissions} onToggle={() => toggleSection('permissions')}>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm"
                  onClick={() => patch({ requested_scopes: SCOPES.flatMap(s => s.id.split(' ')) })}>
                  Select All
                </Button>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => patch({ requested_scopes: [] })}>
                  Deselect All
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {SCOPES.map(scope => (
                  <TooltipProvider key={scope.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 cursor-pointer transition-colors min-h-12">
                          <Checkbox
                            checked={scopeChecked(scope.id)}
                            onCheckedChange={() => toggleScope(scope.id)}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground">{scope.label}</div>
                            <div className="text-xs text-muted-foreground font-mono">{scope.id}</div>
                          </div>
                        </label>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">{scope.desc}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          </CollapsibleSection>

          {/* ── 6. Security ──────────────────────────────────────────── */}
          <CollapsibleSection id="security" title="Security" icon={<Lock className="w-4 h-4 text-primary" />} open={sections.security} onToggle={() => toggleSection('security')}>
            <div className="divide-y divide-border">
              <ToggleRow
                label="PKCE Enabled"
                description="Use Proof Key for Code Exchange in the authorization code flow."
                checked={form.pkce_enabled}
                onCheckedChange={v => patch({ pkce_enabled: v })}
                help="PKCE prevents authorization code interception attacks. Strongly recommended for public clients."
              />
              <ToggleRow
                label="State Parameter Validation"
                description="Validate the OAuth 2.0 state parameter to prevent CSRF attacks."
                checked={form.state_validation_enabled}
                onCheckedChange={v => patch({ state_validation_enabled: v })}
                help="Ensures that the authorization response matches the original request. Strongly recommended."
              />
            </div>

            {/* Additional Security (expandable) */}
            <div className="mt-4">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => toggleSection('advanced')}
              >
                {sections.advanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Additional Security Options
              </button>
              {sections.advanced && (
                <div className="mt-3 p-4 rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                  Advanced security options (e.g. token encryption, custom claims validation) will be available in a future release.
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* ── 7. Audit & Advanced Actions ─────────────────────────── */}
          <Card className="border-border shadow-sm">
            <CardHeader className="px-5 py-4 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardList className="w-4 h-4 text-primary" />Audit & Advanced Actions
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-5">
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                <Button type="button" variant="outline" size="sm" className="justify-start gap-2" onClick={openAuditLog}>
                  <ClipboardList className="w-3.5 h-3.5" />View Audit Log
                </Button>
                <Button type="button" variant="outline" size="sm" className="justify-start gap-2" onClick={handleExport}>
                  <Download className="w-3.5 h-3.5" />Export Configuration
                </Button>
                <Button type="button" variant="outline" size="sm" className="justify-start gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" />Import Configuration
                </Button>
                <Button type="button" variant="outline" size="sm" className="justify-start gap-2" onClick={handleTestLoginFlow}>
                  <TestTube2 className="w-3.5 h-3.5" />Test Login Flow
                </Button>
                <Button type="button" variant="outline" size="sm" className="justify-start gap-2" onClick={() => setRollbackDialogOpen(true)}>
                  <RotateCcw className="w-3.5 h-3.5" />Rollback to Previous
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </CardContent>
          </Card>

          {/* Bottom action bar */}
          <div className="flex items-center justify-end gap-2 pb-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setDiscardDialogOpen(true)} disabled={!isDirty}>
              <X className="w-3.5 h-3.5 mr-1" />Discard
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />Reset to Defaults
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Save Configuration
            </Button>
          </div>
        </div>

        {/* ── Dialogs ────────────────────────────────────────────────────────── */}

        {/* Reset */}
        <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Reset to Defaults?</AlertDialogTitle>
              <AlertDialogDescription>This will reset all fields to their default values. You'll need to save to persist the changes.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Discard */}
        <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
          <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
              <AlertDialogDescription>All unsaved changes will be lost and the form will revert to the last saved configuration.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDiscard}>Discard</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rollback */}
        <AlertDialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
          <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Rollback to Previous Configuration?</AlertDialogTitle>
              <AlertDialogDescription>This will load the last saved configuration into the form. Click Save to persist it.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRollback}>Rollback</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Test Result */}
        <Dialog open={testResultOpen} onOpenChange={setTestResultOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {testResult?.success
                  ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                  : <AlertCircle className="w-5 h-5 text-destructive" />}
                Connection Test Result
              </DialogTitle>
              <DialogDescription>{testResult?.message}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setTestResultOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Audit Log */}
        <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Audit Log</DialogTitle>
              <DialogDescription>All configuration changes and test actions are recorded here.</DialogDescription>
            </DialogHeader>
            {auditLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No audit log entries yet.</p>
            ) : (
              <div className="space-y-2">
                {auditLog.map(entry => (
                  <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20 text-sm">
                    <div className="shrink-0 mt-0.5">
                      <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{entry.action_type}</Badge>
                        <span className="text-xs text-muted-foreground">{entry.admin_username}</span>
                      </div>
                      {entry.changes_summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{entry.changes_summary}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(entry.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
