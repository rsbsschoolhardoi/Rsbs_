import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { ApiLog } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  RefreshCw, 
  Calendar, 
  Clock, 
  Globe, 
  AlertCircle, 
  CheckCircle2, 
  FileText,
  Loader2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ApiLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    setRefreshing(true);
    const { data } = await api.getApiLogs(100);
    setLogs(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'bg-success/10 text-success';
    if (code >= 400 && code < 500) return 'bg-warning/10 text-warning';
    return 'bg-destructive/10 text-destructive';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> API Traffic & Audit Monitoring
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time tracking of data requests and access attempts</p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchLogs} 
          disabled={refreshing}
          className="rounded-2xl gap-2 border-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Activity
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl bg-background border flex flex-col overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[150px] text-xs font-bold font-medium h-12 pl-8">Client Key</TableHead>
                <TableHead className="text-xs font-bold font-medium h-12">Endpoint / Path</TableHead>
                <TableHead className="text-xs font-bold font-medium h-12">Method</TableHead>
                <TableHead className="text-xs font-bold font-medium h-12">Status</TableHead>
                <TableHead className="text-xs font-bold font-medium h-12">Source IP</TableHead>
                <TableHead className="text-right text-xs font-bold font-medium h-12 pr-8">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
                      <p className="text-xs font-bold font-medium text-muted-foreground">Streaming access logs...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 opacity-50">
                      <Activity className="w-10 h-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-medium">No API activity logged yet.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="group hover:bg-muted/10 transition-colors border-none">
                    <TableCell className="font-semibold text-[11px] font-medium pl-8">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        {log.api_keys?.name || 'Unknown Client'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground font-mono">{log.path}</span>
                        <span className="text-xs text-muted-foreground font-bold uppercase tracking-tighter truncate max-w-[200px]">
                          {log.response_summary || 'No details available'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-semibold border-primary/20 text-primary bg-primary/5">
                        {log.method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs font-bold uppercase rounded-lg border-none ${getStatusColor(log.status_code)}`}>
                        {log.status_code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 font-mono">
                        <Globe className="w-3 h-3" />
                        {log.ip_address || '0.0.0.0'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-foreground">{new Date(log.created_at).toLocaleDateString()}</span>
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
