import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { ModuleApi } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Zap, 
  Check, 
  Loader2, 
  Database, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Copy, 
  Power, 
  RotateCw, 
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const AVAILABLE_MODULES = [
  { id: 'admissions', name: 'Admissions', description: 'External admission form submissions' },
  { id: 'appointments', name: 'Appointments', description: 'Parent-teacher meeting requests' },
  { id: 'students', name: 'Students', description: 'Student profile data ingestion' },
  { id: 'teachers', name: 'Teachers', description: 'Teacher profile data ingestion' },
  { id: 'attendance', name: 'Attendance', description: 'Attendance record submissions' },
  { id: 'notices', name: 'Notices', description: 'Notice/announcement submissions' },
  { id: 'gallery', name: 'Gallery', description: 'Event photo submissions' },
  { id: 'fees', name: 'Fees', description: 'Fee record submissions' },
];

export default function AutoApiConfig() {
  const [moduleApis, setModuleApis] = useState<ModuleApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [enablingModule, setEnablingModule] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newlyCreatedApi, setNewlyCreatedApi] = useState<ModuleApi | null>(null);

  const fetchModuleApis = async () => {
    setLoading(true);
    const { data } = await api.getModuleApis();
    setModuleApis(data);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      await api.migrateLegacyApis();
      fetchModuleApis();
    };
    init();
  }, []);

  const handleEnableModule = async (moduleName: string) => {
    setEnablingModule(moduleName);
    const { data, error } = await api.analyzeAndEnableModuleApi(moduleName);
    if (error) {
      toast.error(`Failed to enable API for ${moduleName}: ${error.message}`);
    } else if (data) {
      toast.success(`${data.api_name} generated and bound successfully`);
      setNewlyCreatedApi(data);
      setShowKeyDialog(true);
      fetchModuleApis();
    }
    setEnablingModule(null);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await api.updateModuleApi(id, { is_active: !currentStatus });
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`API ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchModuleApis();
    }
  };

  const handleRegenerateKey = async (id: string) => {
    if (!confirm('Regenerate API Key? The old key will immediately stop working.')) return;
    const { error } = await api.regenerateModuleApiKey(id);
    if (error) {
      toast.error('Failed to regenerate key');
    } else {
      toast.success('API Key regenerated successfully');
      fetchModuleApis();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'simple': return 'bg-success/10 text-success';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'complex': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8">
      <Alert className="border-primary/20 bg-primary/5 rounded-2xl">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <AlertTitle className="text-sm font-semibold">Automatic API Configuration System</AlertTitle>
        <AlertDescription className="text-xs mt-2">
          Click "Enable API" on any module to automatically generate a secure, inbound-only POST endpoint with schema validation, rate limiting, and zero data exposure.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted/20 animate-pulse rounded-2xl" />
          ))
        ) : (
          AVAILABLE_MODULES.map((module) => {
            const existingApi = moduleApis.find(api => api.module_name === module.id);
            const isEnabled = !!existingApi;
            const isEnabling = enablingModule === module.id;

            return (
              <Card key={module.id} className={`border-none shadow-sm rounded-2xl overflow-hidden transition-all hover:shadow-md ${isEnabled ? 'bg-background border' : 'bg-muted/10 border-2 border-dashed border-muted-foreground/20'}`}>
                <CardHeader className="p-6 pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Database className="w-6 h-6 text-primary" />
                    </div>
                    {isEnabled && (
                      <Badge className={`text-xs font-semibold uppercase rounded-lg border-none ${existingApi.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {existingApi.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-semibold">{module.name}</CardTitle>
                  <CardDescription className="text-xs">{module.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  {isEnabled && existingApi ? (
                    <>
                      <div className="space-y-4 pt-2">
                        <div className="relative pl-6 space-y-3">
                          <div className="absolute left-[7px] top-0 bottom-0 w-[2px] bg-primary/20 rounded-full" />
                          
                          <div className="relative">
                            <div className="absolute -left-[23px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-muted-foreground">Module</span>
                              <span className="text-sm font-bold">{module.name}</span>
                            </div>
                          </div>

                          <div className="relative">
                            <div className="absolute -left-[23px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-muted-foreground">Linked API</span>
                              <span className="text-sm font-bold text-primary">{existingApi.api_name}</span>
                            </div>
                          </div>

                          <div className="relative">
                            <div className="absolute -left-[23px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-muted-foreground">Endpoint</span>
                              <code className="text-xs font-mono font-bold bg-muted p-1 rounded w-fit">{existingApi.endpoint_path || `/api/${module.id}`}</code>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <div className="p-2 bg-muted/30 rounded-xl flex flex-col items-center justify-center">
                            <span className="text-xs font-semibold uppercase text-muted-foreground">Rate Limit</span>
                            <span className="text-xs font-bold">{existingApi.rate_limit_minute}/min</span>
                          </div>
                          <div className="p-2 bg-muted/30 rounded-xl flex flex-col items-center justify-center">
                            <span className="text-xs font-semibold uppercase text-muted-foreground">Complexity</span>
                            <Badge className={`text-xs font-semibold uppercase rounded-md border-none px-1 h-4 ${getComplexityColor(existingApi.complexity)}`}>
                              {existingApi.complexity || 'Simple'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-muted/30 rounded-2xl space-y-2 border border-muted">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">API Access Key</span>
                        <div className="flex items-center gap-2 bg-background p-2 rounded-lg border border-muted-foreground/10">
                          <code className="text-xs font-mono flex-1 truncate">
                            {visibleKeys[existingApi.id] ? existingApi.api_key : '••••••••••••••••••••••••••••'}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-md"
                            onClick={() => setVisibleKeys(prev => ({ ...prev, [existingApi.id]: !prev[existingApi.id] }))}
                          >
                            {visibleKeys[existingApi.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-md"
                            onClick={() => copyToClipboard(existingApi.api_key)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-muted border-dashed">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 rounded-xl h-9 text-xs font-bold"
                          onClick={() => handleToggleStatus(existingApi.id, existingApi.is_active)}
                        >
                          <Power className="w-3 h-3 mr-2" />
                          {existingApi.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 rounded-xl h-9 text-xs font-bold"
                          onClick={() => handleRegenerateKey(existingApi.id)}
                        >
                          <RotateCw className="w-3 h-3 mr-2" />
                          Regenerate
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-start gap-2 p-3 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/20">
                        <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Enabling this module will auto-generate a secure API endpoint with schema validation based on database structure.
                        </p>
                      </div>
                      <Button 
                        className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20"
                        onClick={() => handleEnableModule(module.id)}
                        disabled={isEnabling}
                      >
                        {isEnabling ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing & Configuring...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Enable API
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent className="rounded-2xl sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              API Successfully Enabled
            </DialogTitle>
            <DialogDescription className="text-xs font-medium font-medium text-muted-foreground">
              Save this API key securely - it won't be shown again
            </DialogDescription>
          </DialogHeader>
          {newlyCreatedApi && (
            <div className="space-y-4 py-4">
              <Alert className="border-amber-200 bg-warning/10 rounded-2xl">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-xs font-semibold text-amber-900">Important</AlertTitle>
                <AlertDescription className="text-xs text-amber-800 mt-1">
                  Copy and store this API key now. For security reasons, you won't be able to view it again.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">Module</span>
                <div className="p-3 bg-muted/30 rounded-xl border border-muted">
                  <span className="text-sm font-bold">{newlyCreatedApi.api_name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">API Key</span>
                <div className="flex items-center gap-2 p-3 bg-background rounded-xl border-2 border-primary/20">
                  <code className="text-xs font-mono flex-1 break-all">
                    {newlyCreatedApi.api_key}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-md shrink-0"
                    onClick={() => copyToClipboard(newlyCreatedApi.api_key)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">Endpoint</span>
                <div className="p-3 bg-muted/30 rounded-xl border border-muted">
                  <code className="text-xs font-mono">{newlyCreatedApi.endpoint_path || `/api/v1/modules/${newlyCreatedApi.module_name}/submit`}</code>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-muted/20 rounded-xl border border-dashed text-center">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Complexity</div>
                  <Badge className={`text-xs font-semibold uppercase rounded-lg border-none ${getComplexityColor(newlyCreatedApi.complexity)}`}>
                    {newlyCreatedApi.complexity || 'N/A'}
                  </Badge>
                </div>
                <div className="p-3 bg-muted/20 rounded-xl border border-dashed text-center">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Method</div>
                  <Badge className="text-xs font-semibold uppercase rounded-lg border-none bg-info/10 text-info">
                    POST
                  </Badge>
                </div>
                <div className="p-3 bg-muted/20 rounded-xl border border-dashed text-center">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Rate Limit</div>
                  <span className="text-xs font-bold">{newlyCreatedApi.rate_limit_minute}/min</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowKeyDialog(false)} className="w-full h-11 rounded-xl font-bold">
              <Check className="w-4 h-4 mr-2" />
              I've Saved the Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
