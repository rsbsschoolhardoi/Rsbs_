import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { ApiEndpoint } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Database, 
  Plus, 
  Trash2, 
  Settings2, 
  CheckCircle2, 
  Power, 
  Server, 
  Code, 
  ArrowRight,
  Loader2,
  X
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function ApiEndpoints() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [modules, setModules] = useState<{ table_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Create/Edit form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    module_name: '',
    path: '',
    methods: ['GET'],
    exposed_fields: [] as string[]
  });
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [endpointRes, moduleRes] = await Promise.all([
      api.getApiEndpoints(),
      api.getPublicTables()
    ]);
    setEndpoints(endpointRes.data);
    setModules(moduleRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleModuleChange = async (moduleName: string) => {
    setFormData(prev => ({ 
      ...prev, 
      module_name: moduleName, 
      path: prev.path || `/${moduleName}`,
      exposed_fields: [] 
    }));
    setColumnsLoading(true);
    const { data } = await api.getTableColumns(moduleName);
    setAvailableColumns(data);
    setColumnsLoading(false);
  };

  const handleMethodToggle = (method: string) => {
    setFormData(prev => ({
      ...prev,
      methods: prev.methods.includes(method)
        ? prev.methods.filter(m => m !== method)
        : [...prev.methods, method]
    }));
  };

  const handleFieldToggle = (field: string) => {
    setFormData(prev => ({
      ...prev,
      exposed_fields: prev.exposed_fields.includes(field)
        ? prev.exposed_fields.filter(f => f !== field)
        : [...prev.exposed_fields, field]
    }));
  };

  const handleSaveEndpoint = async () => {
    if (!formData.module_name || !formData.path || formData.methods.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsCreating(true);
    let error;
    if (editingId) {
      const res = await api.updateApiEndpoint(editingId, formData);
      error = res.error;
    } else {
      const res = await api.createApiEndpoint(formData);
      error = res.error;
    }

    if (error) {
      toast.error('Failed to save API endpoint');
    } else {
      toast.success(`API endpoint ${editingId ? 'updated' : 'created'} successfully`);
      setEditingId(null);
      resetForm();
      fetchData();
    }
    setIsCreating(false);
  };

  const resetForm = () => {
    setFormData({
      module_name: '',
      path: '',
      methods: ['GET'],
      exposed_fields: []
    });
    setAvailableColumns([]);
  };

  const handleEdit = async (endpoint: ApiEndpoint) => {
    setEditingId(endpoint.id);
    setFormData({
      module_name: endpoint.module_name,
      path: endpoint.path,
      methods: endpoint.methods,
      exposed_fields: endpoint.exposed_fields || []
    });
    setColumnsLoading(true);
    const { data } = await api.getTableColumns(endpoint.module_name);
    setAvailableColumns(data);
    setColumnsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API endpoint?')) return;
    const { error } = await api.deleteApiEndpoint(id);
    if (error) {
      toast.error('Failed to delete endpoint');
    } else {
      toast.success('Endpoint deleted successfully');
      fetchData();
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await api.toggleApiEndpointStatus(id, !currentStatus);
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Endpoint ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" /> API Resource Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure endpoints and granular data exposure per module</p>
        </div>
        <Dialog onOpenChange={(open) => !open && !editingId && resetForm()}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl gap-2 shadow-lg hover:shadow-primary/20">
              <Plus className="w-4 h-4" /> Create API Endpoint
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[600px] max-h-[90vh] overflow-y-auto no-scrollbar">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">{editingId ? 'Edit' : 'Create'} API Endpoint</DialogTitle>
              <DialogDescription className="text-xs font-medium font-medium text-muted-foreground">
                Configure data visibility and access methods
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold font-medium">Target Data Module</Label>
                  <Select value={formData.module_name} onValueChange={handleModuleChange} disabled={!!editingId}>
                    <SelectTrigger className="rounded-xl border-2 h-12">
                      <SelectValue placeholder="Select Module" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {modules.map(m => (
                        <SelectItem key={m.table_name} value={m.table_name} className="rounded-lg capitalize">{m.table_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold font-medium">Public Endpoint Path</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">/api</span>
                    <Input
                      value={formData.path}
                      onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
                      placeholder="/v1/resource"
                      className="rounded-xl border-2 h-12 pl-10 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold font-medium">Allowed Methods</Label>
                <div className="flex flex-wrap gap-2">
                  {HTTP_METHODS.map(method => (
                    <Badge 
                      key={method}
                      variant={formData.methods.includes(method) ? "default" : "outline"}
                      className={`cursor-pointer px-4 py-1.5 rounded-xl text-[11px] font-semibold tracking-widest transition-all ${
                        formData.methods.includes(method) 
                          ? 'bg-primary text-white shadow-md scale-105' 
                          : 'bg-muted/30 hover:bg-muted/50 border-none opacity-50'
                      }`}
                      onClick={() => handleMethodToggle(method)}
                    >
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold font-medium">Data Field Control (Selection & Masking)</Label>
                  <Badge variant="outline" className="text-xs font-bold uppercase border-primary/20 text-primary">
                    {formData.exposed_fields.length} Fields Selected
                  </Badge>
                </div>
                <div className="p-4 rounded-2xl bg-muted/20 border-2 border-dashed border-muted min-h-[120px]">
                  {columnsLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs font-bold font-medium text-muted-foreground">Analysing Module Schema...</span>
                    </div>
                  ) : availableColumns.length === 0 ? (
                    <p className="text-xs font-bold font-medium text-muted-foreground text-center py-8">Select a module to view available fields</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {availableColumns.map(column => (
                        <div key={column} className="flex items-center space-x-2 bg-background p-2 rounded-xl border border-muted-foreground/10 hover:border-primary/30 transition-colors">
                          <Checkbox 
                            id={`col-${column}`} 
                            checked={formData.exposed_fields.includes(column)}
                            onCheckedChange={() => handleFieldToggle(column)}
                            className="rounded-md border-2 border-primary data-[state=checked]:bg-primary"
                          />
                          <label 
                            htmlFor={`col-${column}`}
                            className="text-[11px] font-semibold uppercase tracking-tight text-foreground/80 cursor-pointer select-none"
                          >
                            {column}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-medium italic">* Selected fields will be exposed via the API. All other fields remain masked.</p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => { setEditingId(null); resetForm(); }} className="rounded-xl font-bold border-2">Cancel</Button>
              <Button onClick={handleSaveEndpoint} disabled={isCreating} className="rounded-xl font-semibold tracking-widest shadow-lg hover:shadow-primary/20 min-w-[120px]">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Save Changes" : "Deploy Endpoint"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-2xl" />
          ))
        ) : endpoints.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-muted/10 rounded-2xl border-2 border-dashed border-muted-foreground/20">
            <p className="text-muted-foreground font-bold font-medium text-xs">No API endpoints configured yet.</p>
          </div>
        ) : (
          endpoints.map((endpoint) => (
            <Card key={endpoint.id} className="border-none shadow-sm rounded-2xl bg-background border hover:shadow-md transition-all group overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-xs font-semibold border-primary/20 text-primary bg-primary/5">
                      {endpoint.module_name}
                    </Badge>
                    <CardTitle className="text-md font-semibold tracking-tight flex items-center gap-2 group-hover:text-primary transition-colors">
                      <Code className="w-4 h-4 text-primary" /> {endpoint.path}
                    </CardTitle>
                  </div>
                  <Badge className={`text-xs font-semibold uppercase rounded-lg border-none ${endpoint.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {endpoint.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-4">
                <div className="flex flex-wrap gap-1">
                  {endpoint.methods.map(m => (
                    <span key={m} className="text-xs font-semibold bg-muted/50 px-2 py-0.5 rounded-md text-foreground/70 uppercase">
                      {m}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs font-bold font-medium text-muted-foreground bg-muted/20 p-2 rounded-xl">
                  <span>{endpoint.exposed_fields?.length || 0} Fields Exposed</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                    <span>Masking Enabled</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 justify-end pt-2 border-t border-muted border-dashed">
                  <Dialog onOpenChange={(open) => !open && !editingId && resetForm()}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                        onClick={() => handleEdit(endpoint)}
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    {/* Re-using the same DialogContent from above via state sharing if possible, but for simplicity we re-render */}
                  </Dialog>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 rounded-lg ${endpoint.is_active ? 'text-info hover:bg-info/10' : 'text-success hover:bg-success/10'}`}
                    onClick={() => handleToggleStatus(endpoint.id, endpoint.is_active)}
                  >
                    <Power className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(endpoint.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
