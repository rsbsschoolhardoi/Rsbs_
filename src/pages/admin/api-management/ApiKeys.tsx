import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { ApiKey } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Key, 
  Plus, 
  Trash2, 
  RotateCw, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Power, 
  ShieldCheck, 
  Calendar, 
  Clock,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    const { data } = await api.getApiKeys();
    setKeys(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }
    setIsCreating(true);
    const { data, error } = await api.createApiKey(newKeyName);
    if (error) {
      toast.error('Failed to create API key');
    } else {
      toast.success('API key created successfully');
      setNewKeyName('');
      fetchKeys();
    }
    setIsCreating(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await api.toggleApiKeyStatus(id, !currentStatus);
    if (error) {
      toast.error('Failed to update API key status');
    } else {
      toast.success(`API key ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchKeys();
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return;
    const { error } = await api.deleteApiKey(id);
    if (error) {
      toast.error('Failed to delete API key');
    } else {
      toast.success('API key deleted successfully');
      fetchKeys();
    }
  };

  const handleRegenerateKey = async (id: string) => {
    if (!confirm('Are you sure you want to regenerate this API key? The old key will stop working immediately.')) return;
    const { error } = await api.regenerateApiKey(id);
    if (error) {
      toast.error('Failed to regenerate API key');
    } else {
      toast.success('API key regenerated successfully');
      fetchKeys();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> API Key Access Control
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage secure tokens for external application connectivity</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="rounded-2xl gap-2 shadow-lg hover:shadow-primary/20">
              <Plus className="w-4 h-4" /> Issue New Key
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Issue API Access Token</DialogTitle>
              <DialogDescription className="text-xs font-medium font-medium text-muted-foreground">
                Identify the application or client using this key
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs font-bold font-medium">Client Name / Application</Label>
                <Input
                  id="name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Official Mobile App"
                  className="rounded-xl border-2 focus-visible:ring-primary h-12"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateKey} disabled={isCreating} className="w-full h-12 rounded-xl text-md font-bold">
                {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate Secure Key"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm rounded-2xl bg-background border flex flex-col overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[200px] text-xs font-bold font-medium h-12 pl-8">Client Name</TableHead>
                <TableHead className="text-xs font-bold font-medium h-12">API Key / Token</TableHead>
                <TableHead className="text-xs font-bold font-medium h-12">Status</TableHead>
                <TableHead className="text-xs font-bold font-medium h-12">Created At</TableHead>
                <TableHead className="text-right text-xs font-bold font-medium h-12 pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
                      <p className="text-xs font-bold font-medium text-muted-foreground">Retrieving secure keys...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <p className="text-sm text-muted-foreground">No API keys generated yet.</p>
                  </TableCell>
                </TableRow>
              ) : (
                keys.map((key) => (
                  <TableRow key={key.id} className="group hover:bg-muted/10 transition-colors border-none">
                    <TableCell className="font-semibold text-sm pl-8">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Key className="w-4 h-4" />
                        </div>
                        {key.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-[300px]">
                        <code className="text-[11px] bg-muted px-2 py-1 rounded font-mono truncate flex-1">
                          {visibleKeys[key.id] ? key.key_value : "••••••••••••••••••••••••••••••••"}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg"
                          onClick={() => toggleVisibility(key.id)}
                        >
                          {visibleKeys[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg"
                          onClick={() => copyToClipboard(key.key_value)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.is_active ? "default" : "secondary"} className={`text-xs uppercase font-bold px-2 py-0 ${key.is_active ? 'bg-success/10 text-success hover:bg-success/10' : 'bg-destructive/10 text-destructive hover:bg-destructive/10'}`}>
                        {key.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {new Date(key.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {key.last_used_at ? `Last used: ${new Date(key.last_used_at).toLocaleTimeString()}` : 'Never used'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-info hover:bg-info/10 rounded-lg"
                          title={key.is_active ? "Deactivate" : "Activate"}
                          onClick={() => handleToggleStatus(key.id, key.is_active)}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-warning hover:bg-warning/10 rounded-lg"
                          title="Regenerate Key"
                          onClick={() => handleRegenerateKey(key.id)}
                        >
                          <RotateCw className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                          title="Delete Key"
                          onClick={() => handleDeleteKey(key.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
