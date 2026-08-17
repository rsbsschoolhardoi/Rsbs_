import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { ModuleApi } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Activity, 
  RefreshCw, 
  Send, 
  Settings, 
  RotateCw, 
  Loader2, 
  ShieldCheck, 
  Key,
  Database,
  Eye,
  EyeOff,
  Copy
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ModuleApiActivityProps {
  moduleName: string;
}

const getComplexityColor = (complexity?: string) => {
  switch (complexity) {
    case 'simple': return 'bg-green-100 text-green-700';
    case 'medium': return 'bg-amber-100 text-amber-700';
    case 'complex': return 'bg-red-100 text-red-700';
    default: return 'bg-muted text-muted-foreground';
  }
};

export default function ModuleApiActivity({ moduleName }: ModuleApiActivityProps) {
  const [moduleApis, setModuleApis] = useState<ModuleApi[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    setRefreshing(true);
    const [apiRes, logRes] = await Promise.all([
      api.getModuleApis(moduleName),
      api.getApiLogs(20) // We'll filter logs in JS or update API to filter by module
    ]);
    
    setModuleApis(apiRes.data);
    
    // Filter logs that belong to these specific module APIs
    const apiIds = apiRes.data.map(a => a.id);
    setLogs(logRes.data.filter(l => apiIds.includes(l.module_api_id)));
    
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [moduleName]);

  const handleRegenerateKey = async (id: string) => {
    if (!confirm('Regenerate API Key? The old key will stop working.')) return;
    const { error } = await api.regenerateModuleApiKey(id);
    if (error) {
      toast.error('Failed to regenerate key');
    } else {
      toast.success('API Key regenerated');
      fetchData();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Key copied');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">External Data Submissions</h3>
            <p className="text-[10px] text-muted-foreground font-medium uppercase">API connectivity for {moduleName} module</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchData} 
          disabled={refreshing}
          className="rounded-xl gap-2 border-2 h-9"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Sync Activity
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">Configured APIs</h4>
          {loading ? (
            <div className="h-32 bg-muted/20 animate-pulse rounded-2xl" />
          ) : moduleApis.length === 0 ? (
            <Card className="rounded-2xl border-2 border-dashed border-muted bg-transparent shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <ShieldCheck className="w-8 h-8 text-muted-foreground opacity-20" />
                <p className="text-[10px] font-bold uppercase text-muted-foreground">No APIs configured for this module</p>
                <Button variant="link" className="text-[9px] font-black uppercase" asChild>
                  <a href="/admin/api-management">Create one in API Management</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            moduleApis.map(apiItem => (
              <Card key={apiItem.id} className="rounded-2xl border-2 shadow-none overflow-hidden group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                        <Key className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black">{apiItem.api_name}</span>
                        <Badge className={`text-[8px] font-black uppercase rounded-lg border-none w-fit ${getComplexityColor(apiItem.complexity)}`}>
                          {apiItem.complexity || 'Simple'}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant={apiItem.is_active ? 'default' : 'secondary'} className="text-[9px] uppercase font-bold rounded-md px-1.5 h-5">
                      {apiItem.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 bg-muted/30 p-2 rounded-xl border border-muted-foreground/5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black uppercase text-muted-foreground">Endpoint</span>
                      <code className="text-[9px] font-mono font-bold">{apiItem.endpoint_path || `/api/v1/modules/${apiItem.module_name}/submit`}</code>
                    </div>
                    <div className="flex items-center gap-2 bg-background p-2 rounded-lg border border-muted-foreground/10">
                      <code className="text-[10px] font-mono flex-1 truncate opacity-70">
                        {visibleKeys[apiItem.id] ? apiItem.api_key : '••••••••••••••••'}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-md"
                        onClick={() => setVisibleKeys(prev => ({ ...prev, [apiItem.id]: !prev[apiItem.id] }))}
                      >
                        {visibleKeys[apiItem.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-md"
                        onClick={() => copyToClipboard(apiItem.api_key)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-md text-amber-600"
                        onClick={() => handleRegenerateKey(apiItem.id)}
                      >
                        <RotateCw className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">Recent Submissions</h4>
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-background border overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 pl-6">Status</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Client IP</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase tracking-widest h-10 pr-6">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/30" />
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center text-[10px] font-bold uppercase text-muted-foreground opacity-50">
                        No recent submissions
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map(log => (
                      <TableRow key={log.id} className="hover:bg-muted/10 border-none transition-colors">
                        <TableCell className="pl-6 py-3">
                          <Badge className={`text-[9px] font-black uppercase rounded-lg border-none ${log.status_code < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {log.status_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-[10px] font-mono font-bold opacity-60">{log.ip_address || '0.0.0.0'}</span>
                        </TableCell>
                        <TableCell className="text-right pr-6 py-3">
                          <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
