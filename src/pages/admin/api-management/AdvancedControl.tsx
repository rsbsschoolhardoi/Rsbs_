import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { ModuleApi } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  ShieldAlert, 
  Settings2, 
  Check, 
  X, 
  Lock, 
  ChevronRight,
  AlertTriangle,
  Loader2,
  LockKeyhole
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

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function AdvancedControl() {
  const [moduleApis, setModuleApis] = useState<ModuleApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Security protocol states
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [pendingApiId, setPendingApiId] = useState<string | null>(null);
  const [pendingMethod, setPendingMethod] = useState<string | null>(null);
  const [pendingState, setPendingState] = useState(false);
  const [understandRisk, setUnderstandRisk] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const fetchModuleApis = async () => {
    setLoading(true);
    const { data } = await api.getModuleApis();
    setModuleApis(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await fetchModuleApis();
  };

  const handleMethodToggle = (id: string, method: string, currentState: boolean) => {
    // If enabling anything other than POST, trigger security protocol
    if (!currentState && method !== 'POST') {
      setPendingApiId(id);
      setPendingMethod(method);
      setPendingState(true);
      setShowSecurityDialog(true);
      setUnderstandRisk(false);
      setAdminPassword('');
      return;
    }
    
    // For disabling or toggling POST, do it directly
    performMethodUpdate(id, method, !currentState);
  };

  const performMethodUpdate = async (id: string, method: string, enable: boolean) => {
    const apiToUpdate = moduleApis.find(a => a.id === id);
    if (!apiToUpdate) return;

    setUpdating(`${id}-${method}`);
    let currentMethods = apiToUpdate.allowed_methods || ['POST'];
    
    let newMethods: string[];
    if (enable) {
      newMethods = [...new Set([...currentMethods, method])];
    } else {
      newMethods = currentMethods.filter(m => m !== method);
    }

    const { error } = await api.updateModuleApiMethods(id, newMethods);
    if (error) {
      toast.error('Failed to update method configuration');
    } else {
      toast.success(`Method ${method} ${enable ? 'enabled' : 'disabled'} for ${apiToUpdate.api_name}`);
      await fetchModuleApis();
    }
    setUpdating(null);
  };

  const confirmSecurityAction = () => {
    if (!understandRisk) {
      toast.error('You must acknowledge that you understand the risks.');
      return;
    }
    if (!adminPassword) {
      toast.error('Administrator password is required.');
      return;
    }
    
    // In a real system, you'd verify the password with the server here.
    // For this demonstration, we assume verification and proceed.
    if (pendingApiId && pendingMethod) {
      performMethodUpdate(pendingApiId, pendingMethod, true);
    }
    setShowSecurityDialog(false);
  };

  return (
    <div className="space-y-8">
      <Alert className="border-red-200 bg-red-50 rounded-2xl">
        <ShieldAlert className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-sm font-black uppercase tracking-widest text-red-900">Advanced Method-Level Control</AlertTitle>
        <AlertDescription className="text-xs mt-2 text-red-800">
          This system provides granular control over the HTTP methods allowed for each API. By default, only **POST** is enabled for data submission. Enabling additional methods increases the potential surface area for data exposure.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-[2.5rem]" />
          ))
        ) : moduleApis.length === 0 ? (
          <div className="py-12 text-center bg-muted/10 rounded-[2.5rem] border-2 border-dashed border-muted-foreground/20">
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs italic">No submission APIs configured yet.</p>
          </div>
        ) : (
          moduleApis.map((apiItem) => {
            const currentMethods = apiItem.allowed_methods || ['POST'];
            return (
              <Card key={apiItem.id} className="border-none shadow-sm rounded-[2.5rem] bg-background border hover:shadow-md transition-all overflow-hidden">
                <CardHeader className="p-6 pb-2 bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border shadow-sm">
                        <Settings2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-md font-black">{apiItem.api_name}</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {apiItem.endpoint_path || `/api/${apiItem.module_name}`}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={`text-[9px] font-black uppercase rounded-lg border-none ${apiItem.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {apiItem.is_active ? 'API Active' : 'API Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {HTTP_METHODS.map(method => {
                      const isEnabled = currentMethods.includes(method);
                      const isUpdating = updating === `${apiItem.id}-${method}`;
                      
                      return (
                        <div key={method} className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-3 ${isEnabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/10 border-transparent'}`}>
                          <div className="flex items-center justify-between">
                            <Badge className={`text-[10px] font-black rounded h-5 ${isEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                              {method}
                            </Badge>
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Switch 
                                checked={isEnabled}
                                onCheckedChange={() => handleMethodToggle(apiItem.id, method, isEnabled)}
                              />
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Status</span>
                            <span className={`text-[10px] font-bold ${isEnabled ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {isEnabled ? 'ENABLED' : 'DISABLED'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
        <DialogContent className="rounded-[2rem] sm:max-w-[500px] border-red-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              Security Protocol: {pendingMethod} Method
            </DialogTitle>
            <DialogDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground pt-2 leading-relaxed">
              ⚠️ <strong className="text-red-600">Security Warning:</strong> Enabling this method can expose or modify system data. Proceed only if you fully understand the risks and have appropriate authorization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4 p-4 bg-red-50 rounded-2xl border border-red-100">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="understandRisk" 
                  checked={understandRisk}
                  onCheckedChange={(checked) => setUnderstandRisk(checked as boolean)}
                  className="mt-1 border-red-400 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                />
                <Label htmlFor="understandRisk" className="text-xs font-bold text-red-900 cursor-pointer leading-relaxed">
                  I understand the risks and accept responsibility for enabling the {pendingMethod} method on this API.
                </Label>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <LockKeyhole className="w-3 h-3" /> Administrator Password Required
              </Label>
              <Input 
                type="password"
                placeholder="Enter password to authorize change"
                className="rounded-xl border-2 h-12"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowSecurityDialog(false)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button 
              onClick={confirmSecurityAction} 
              className="rounded-xl font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200"
              disabled={!understandRisk || !adminPassword}
            >
              Authorize & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
