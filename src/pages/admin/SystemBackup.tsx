import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { toast } from 'sonner';
import { Database, Download, Loader2, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import JSZip from 'jszip';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function SystemBackup() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [lastBackup, setLastBackup] = useState<{ name: string; size: string; date: string } | null>(null);

  if (!profile?.is_master) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold uppercase tracking-tight">Access Restricted</h1>
        <p className="text-muted-foreground text-center max-w-md">
          This module is restricted to Master Admin accounts only. 
          Please contact the system administrator for assistance.
        </p>
      </div>
    );
  }

  const generateBackup = async () => {
    setLoading(true);
    setProgress(0);
    setStatus('Initializing full data backup...');
    
    try {
      const zip = new JSZip();
      const dateStr = new Date().toISOString().split('T')[0];
      const rootFolderName = `RSBSBackup_${dateStr}`;
      const rootFolder = zip.folder(rootFolderName);
      
      if (!rootFolder) throw new Error("Failed to create root folder in ZIP");

      // 1. Get all public tables
      setStatus('Scanning database schema...');
      const { data: tables, error: tableError } = await api.getPublicTables();
      if (tableError) throw tableError;
      
      const tableList = (tables || []).map(t => t.table_name);
      
      // 2. Process each table
      const totalTables = tableList.length;
      for (let i = 0; i < tableList.length; i++) {
        const tableName = tableList[i];
        setStatus(`Extracting data: ${tableName}... (${i + 1}/${totalTables})`);
        
        // SELECT * FROM [table_name]
        const { data: records, error: dataError } = await api.getTableData(tableName);
        
        if (dataError) {
          console.error(`Error extracting data for ${tableName}:`, dataError);
          // Log error but continue with other tables to ensure partial success
          toast.error(`Failed to extract table: ${tableName}`);
          continue;
        }

        // Requirement 4: Organize into structured directories
        // Example: /Students/students.json
        const displayFolderName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
        const tableFolder = rootFolder.folder(displayFolderName);
        
        if (tableFolder) {
          // Save the full data dump as requested
          tableFolder.file(`${tableName}.json`, JSON.stringify(records || [], null, 2));
        }
        
        setProgress(Math.round(((i + 1) / totalTables) * 90));
      }

      // 3. Generate ZIP
      setStatus('Finalizing backup package...');
      const blob = await zip.generateAsync({ type: 'blob' });

      // 4. Trigger download
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `RSBS_Full_Data_Backup_${timestamp}.zip`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setLastBackup({
        name: fileName,
        size: `${(blob.size / (1024 * 1024)).toFixed(2)} MB`,
        date: new Date().toLocaleString()
      });

      setProgress(100);
      setStatus('Full data backup generated successfully!');
      toast.success('Full system data backup completed and downloaded.');
    } catch (error: any) {
      console.error('Full backup failed:', error);
      toast.error(`Backup failed: ${error.message}`);
      setStatus('Backup failed. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-primary flex items-center gap-3">
            <Database className="w-8 h-8" />
            System Full Data Backup
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-1">
            Complete database dump for restoration & portability
          </p>
        </div>
        {lastBackup && (
          <Badge variant="outline" className="h-10 px-4 rounded-xl border-green-200 bg-green-50 text-green-700 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Last Backup: {lastBackup.date}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-3xl border-none shadow-xl shadow-primary/5 bg-card/50 backdrop-blur-sm overflow-hidden border border-muted/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Full System Restoration Engine
            </CardTitle>
            <CardDescription className="font-medium text-muted-foreground uppercase text-[10px] tracking-widest">
              Live data extraction for schema and all database records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-900/30 p-6 rounded-3xl flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-600 mt-1 shrink-0" />
              <div className="space-y-2">
                <h4 className="font-black uppercase tracking-tight text-amber-800 dark:text-amber-400">Security Protocol Warning</h4>
                <p className="text-sm font-medium text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                  Warning: This action will generate a complete snapshot of all system data. 
                  The resulting file is highly sensitive as it contains all records, user profiles, 
                  and relational data. Ensure the output ZIP is stored in a secure, encrypted environment.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {loading && (
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black uppercase tracking-widest text-primary animate-pulse">{status}</span>
                    <span className="text-xs font-black tracking-widest text-primary">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 rounded-full" />
                </div>
              )}

              <Button 
                onClick={generateBackup} 
                disabled={loading}
                className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Processing Backup...
                  </>
                ) : (
                  <>
                    <Database className="w-6 h-6 mr-3" />
                    Generate Full Backup
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-none shadow-xl shadow-primary/5 bg-card/50 border border-muted/50">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Scope Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Dynamic Schema Scan', desc: 'Identifies all tables automatically' },
                { label: 'Full Record Capture', desc: 'Exports every record in JSON' },
                { label: 'Relational Integrity', desc: 'Preserves all foreign key mappings' },
                { label: 'Human Readable', desc: 'Structured folder organization' },
                { label: 'Read-Only Protocol', desc: 'Zero impact on production data' }
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight text-foreground">{item.label}</p>
                    <p className="text-[10px] font-medium text-muted-foreground leading-tight">{item.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {lastBackup && (
            <Card className="rounded-3xl border-none shadow-xl shadow-primary/5 bg-primary text-primary-foreground p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest">Backup Ready</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/70 tracking-widest">File Info</p>
                  <p className="text-xs font-bold truncate">{lastBackup.name}</p>
                  <p className="text-xs font-bold">{lastBackup.size}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
