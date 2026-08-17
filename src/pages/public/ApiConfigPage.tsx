import React, { useState, useCallback, useEffect } from 'react';
import { useApiConfigs } from '@/hooks/useApiConfigs';
import { ApiConfig, ApiHeader, ApiVariable, ApiBody, Chatbot } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Edit2, Play, CheckCircle2, AlertCircle, Settings2, ArrowRight, Send, Loader2, Code2, FileJson, Braces, Eye, EyeOff, Copy, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ApiConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const { configs, activeConfig, chatbots, addConfig, updateConfig, deleteConfig, applyConfig, connectModule, isLoaded, API_MODULES } = useApiConfigs();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formState, setFormState] = useState<Partial<ApiConfig>>({
    name: '',
    endpoint: '',
    method: 'POST',
    headers: [{ key: 'Content-Type', value: 'application/json' }],
    variables: [],
    bodies: [{ id: crypto.randomUUID(), name: 'JSON Payload', content: { model: 'gpt-3.5-turbo' }, type: 'text', is_default: true }],
    responseField: 'choices[0].message.content',
    auth_type: 'none'
  });
  const [activeBodyId, setActiveBodyId] = useState<string | null>(formState.bodies?.[0]?.id || null);
  const [jsonBody, setJsonBody] = useState(JSON.stringify(formState.bodies?.[0]?.content || {}, null, 2));
  
  // Update jsonBody when activeBodyId changes
  useEffect(() => {
    if (activeBodyId && formState.bodies) {
      const body = formState.bodies.find(b => b.id === activeBodyId);
      if (body) {
        setJsonBody(JSON.stringify(body.content, null, 2));
      }
    }
  }, [activeBodyId, formState.bodies]);

  // Sync jsonBody changes back to formState
  const handleJsonChange = (val: string) => {
    setJsonBody(val);
    try {
      const parsed = JSON.parse(val);
      setFormState(prev => ({
        ...prev,
        bodies: (prev.bodies || []).map(b => b.id === activeBodyId ? { ...b, content: parsed } : b)
      }));
    } catch (e) {
      // Allow invalid JSON during editing
    }
  };

  // Testing Panel State
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testStatus, setTestStatus] = useState<number | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [responsePath, setResponsePath] = useState('');
  const [extractedValue, setExtractedValue] = useState<any>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const resetForm = () => {
    setIsEditing(null);
    const defaultId = crypto.randomUUID();
    setFormState({
      name: '',
      endpoint: '',
      method: 'POST',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
      variables: [],
      bodies: [{ id: defaultId, name: 'JSON Payload', content: { model: 'gpt-3.5-turbo' }, type: 'text', is_default: true }],
      responseField: 'choices[0].message.content',
      auth_type: 'none',
      apiKey: ''
    });
    setActiveBodyId(defaultId);
    setJsonBody('{\n  "model": "gpt-3.5-turbo"\n}');
    setShowTestPanel(false);
    setTestResponse(null);
    setTestStatus(null);
    setTestError(null);
    setShowApiKey(false);
  };

  const handleEdit = (config: ApiConfig) => {
    setIsEditing(config.id);
    setFormState({
      name: config.name,
      endpoint: config.endpoint,
      method: config.method,
      headers: config.headers,
      variables: config.variables || [],
      bodies: config.bodies,
      responseField: config.responseField,
      auth_type: config.auth_type,
      apiKey: config.apiKey || ''
    });
    const defaultBody = config.bodies.find(b => b.is_default) || config.bodies[0];
    setActiveBodyId(defaultBody.id);
    setJsonBody(JSON.stringify(defaultBody.content, null, 2));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    try {
      if (!formState.name || !formState.endpoint) {
        toast.error('Configuration name and endpoint are required');
        return;
      }

      // Final check on JSON validity
      const bodies = (formState.bodies || []).map(b => {
        if (b.id === activeBodyId) {
          try {
            return { ...b, content: JSON.parse(jsonBody) };
          } catch (e) {
            throw new Error(`Invalid JSON in body "${b.name}"`);
          }
        }
        return b;
      });

      const configData = {
        ...formState,
        bodies,
        variables: formState.variables || []
      } as ApiConfig;

      if (isEditing) {
        await updateConfig(isEditing, configData);
        toast.success('Configuration updated');
        console.log('API Updated. Current configs count:', configs.length);
      } else {
        const saved = await addConfig(configData as any);
        if (saved) {
          toast.success('New configuration created');
          console.log('New API Added. Current configs count:', configs.length + 1);
        }
      }
      resetForm();
    } catch (e: any) {
      console.error('Failed to save API config:', e);
      toast.error(`Error: ${e.message}`);
    }
  };

  // Diagnostic function
  const runDiagnostics = () => {
    console.group('API Toolkit Diagnostics');
    console.log('Is Loaded:', isLoaded);
    console.log('Configs:', configs);
    console.log('Is Configs an Array:', Array.isArray(configs));
    console.log('Active Config:', activeConfig);
    console.log('Chatbots:', chatbots);
    console.groupEnd();
    toast.info(`Diagnostic check: Found ${configs.length} saved configurations.`);
  };

  // Automated test function
  const runAutomatedTest = async () => {
    toast.promise(async () => {
      console.log('--- Starting Automated Test ---');
      const testPrefix = `Test API ${Date.now()}`;
      
      // Save First API
      console.log('Saving First Test API...');
      const api1 = await addConfig({
        name: `${testPrefix} - Alpha`,
        endpoint: 'https://api.example.com/alpha',
        method: 'POST',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        variables: [],
        bodies: [{ id: crypto.randomUUID(), name: 'Default', content: {}, type: 'text', is_default: true }],
        responseField: 'data',
        auth_type: 'none'
      });

      // Save Second API
      console.log('Saving Second Test API...');
      const api2 = await addConfig({
        name: `${testPrefix} - Beta`,
        endpoint: 'https://api.example.com/beta',
        method: 'POST',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        variables: [],
        bodies: [{ id: crypto.randomUUID(), name: 'Default', content: {}, type: 'text', is_default: true }],
        responseField: 'data',
        auth_type: 'none'
      });

      if (api1 && api2) {
        console.log('Successfully saved both APIs.');
        console.log('Total APIs in current state:', configs.length + 2);
        console.log('--- Automated Test Passed ---');
        return 'Both test APIs saved successfully. Check logs for details.';
      }
      throw new Error('Test failed to save both APIs.');
    }, {
      loading: 'Running automated persistence test...',
      success: (data) => data,
      error: (err) => `Test Failed: ${err.message}`
    });
  };

  const addBody = (type: 'text' | 'file' = 'text') => {
    const newId = crypto.randomUUID();
    const newBody: ApiBody = {
      id: newId,
      name: type === 'text' ? `Body ${(formState.bodies?.length || 0) + 1}` : 'File Metadata',
      content: { model: 'gpt-3.5-turbo' },
      type,
      is_default: false
    };
    setFormState(prev => ({
      ...prev,
      bodies: [...(prev.bodies || []), newBody]
    }));
    setActiveBodyId(newId);
    toast.success('New body added');
  };

  const renameBody = (id: string, newName: string) => {
    setFormState(prev => ({
      ...prev,
      bodies: (prev.bodies || []).map(b => b.id === id ? { ...b, name: newName } : b)
    }));
  };

  const setDefaultBody = (id: string) => {
    setFormState(prev => ({
      ...prev,
      bodies: (prev.bodies || []).map(b => ({ ...b, is_default: b.id === id }))
    }));
    toast.success('Default body updated');
  };

  const duplicateBody = (id: string) => {
    const body = formState.bodies?.find(b => b.id === id);
    if (!body) return;
    const newId = crypto.randomUUID();
    const newBody: ApiBody = {
      ...body,
      id: newId,
      name: `${body.name} copy`,
      is_default: false
    };
    setFormState(prev => ({
      ...prev,
      bodies: [...(prev.bodies || []), newBody]
    }));
    setActiveBodyId(newId);
    toast.success('Body duplicated');
  };

  const removeBody = (id: string) => {
    if ((formState.bodies?.length || 0) <= 1) {
      toast.error('At least one body is required');
      return;
    }
    const isDeletingDefault = formState.bodies?.find(b => b.id === id)?.is_default;
    const newBodies = (formState.bodies || []).filter(b => b.id !== id);
    if (isDeletingDefault && newBodies.length > 0) {
      newBodies[0].is_default = true;
    }
    setFormState(prev => ({ ...prev, bodies: newBodies }));
    if (activeBodyId === id) {
      setActiveBodyId(newBodies[0].id);
    }
    toast.success('Body removed');
  };
  
  const addHeader = () => {
    setFormState(prev => ({
      ...prev,
      headers: [...(prev.headers || []), { key: '', value: '' }]
    }));
  };

  const updateHeader = (index: number, field: keyof ApiHeader, value: string) => {
    const newHeaders = [...(formState.headers || [])];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    setFormState(prev => ({ ...prev, headers: newHeaders }));
  };

  const removeHeader = (index: number) => {
    setFormState(prev => ({
      ...prev,
      headers: (prev.headers || []).filter((_, i) => i !== index)
    }));
  };

  const addVariable = () => {
    setFormState(prev => ({
      ...prev,
      variables: [...(prev.variables || []), { id: crypto.randomUUID(), key: '', value: '' }]
    }));
  };

  const updateVariable = (id: string, field: 'key' | 'value', value: string) => {
    setFormState(prev => ({
      ...prev,
      variables: (prev.variables || []).map(v => v.id === id ? { ...v, [field]: value } : v)
    }));
  };

  const removeVariable = (id: string) => {
    setFormState(prev => ({
      ...prev,
      variables: (prev.variables || []).filter(v => v.id !== id)
    }));
  };

  const substituteVariables = (text: string) => {
    let result = text;
    (formState.variables || []).forEach(v => {
      if (v.key && v.value) {
        const regex = new RegExp(`{{${v.key}}}`, 'g');
        result = result.replace(regex, v.value);
      }
    });
    return result;
  };

  const handleTestRequest = async () => {
    if (!formState.endpoint) {
      toast.error('Endpoint URL is required');
      return;
    }

    setIsTesting(true);
    setTestResponse(null);
    setTestStatus(null);
    setTestError(null);
    setExtractedValue(null);
    setShowTestPanel(true);

    try {
      const substitutedUrl = substituteVariables(formState.endpoint);
      const substitutedBody = substituteVariables(jsonBody);
      
      const headerObj: Record<string, string> = {};
      (formState.headers || []).forEach(h => {
        if (h.key) headerObj[h.key] = substituteVariables(h.value);
      });

      if (formState.apiKey && formState.auth_type !== 'none') {
        if (formState.auth_type === 'bearer') {
          headerObj['Authorization'] = `Bearer ${formState.apiKey}`;
        } else if (formState.auth_type === 'api_key') {
          headerObj['X-API-Key'] = formState.apiKey; // Or whatever standard the user wants
        }
      }

      let parsedBody = null;
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(formState.method || 'POST') && substitutedBody.trim()) {
        try {
          parsedBody = JSON.parse(substitutedBody);
        } catch (e) {
          throw new Error('Invalid JSON in request body');
        }
      }

      const startTime = Date.now();
      const res = await axios({
        url: substitutedUrl,
        method: formState.method || 'POST',
        headers: headerObj,
        data: parsedBody,
        timeout: 10000,
      });
      const duration = Date.now() - startTime;

      setTestResponse(res.data);
      setTestStatus(res.status);
      toast.success(`Test request successful (${res.status}) in ${duration}ms`);
    } catch (err: any) {
      const axiosErr = err as any;
      setTestStatus(axiosErr.response?.status || 0);
      setTestResponse(axiosErr.response?.data || null);

      if (axiosErr.response) {
        const status = axiosErr.response.status;
        if (status === 401 || status === 403) {
          setTestError(`Authentication Error (${status}): Access denied. Please check your credentials.`);
        } else if (status === 400 || status === 422) {
          setTestError(`Client Error (${status}): The request was invalid or could not be processed.`);
        } else if (status === 429) {
          setTestError(`Rate Limit Error (${status}): Too many requests. Please wait before trying again.`);
        } else if (status >= 500) {
          setTestError(`Server Error (${status}): The remote server encountered an error.`);
        } else {
          setTestError(`Error (${status}): ${axiosErr.message}`);
        }
      } else if (axiosErr.request) {
        setTestError('Network Error: Failed to fetch. The server may be down or CORS is blocking the request.');
      } else {
        setTestError(`Error: ${err.message}`);
      }
      toast.error('Test request failed');
    } finally {
      setIsTesting(false);
    }
  };

  const extractValue = useCallback((path: string, obj: any) => {
    if (!path || !obj) return null;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }, []);

  const handlePathChange = (val: string) => {
    setResponsePath(val);
    if (testResponse) {
      const result = extractValue(val, testResponse);
      setExtractedValue(result);
    }
  };

  const onApply = async (id: string) => {
    try {
      toast.loading('Testing connection...', { id: 'test-config' });
      await applyConfig(id);
      toast.success('Configuration applied successfully', { 
        id: 'test-config',
        action: {
          label: 'Go to Chat',
          onClick: () => navigate('/ai-chat')
        }
      });
    } catch (e: any) {
      toast.error(`Application failed: ${e.message}`, { id: 'test-config' });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Setup & Configuration</h1>
          <p className="text-muted-foreground mt-1">Configure and manage your AI API endpoints.</p>
        </div>
        <div className="flex gap-2">
          {activeConfig && (
            <Button asChild variant="outline">
              <Link to="/ai-chat" className="flex items-center gap-2">
                Open AI Chat <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Management List */}
        <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> Saved Configs
            </h2>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="icon" onClick={runAutomatedTest} className="h-8 w-8 text-muted-foreground hover:text-green-500" title="Run Automated Persistence Test">
                <Play className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={runDiagnostics} className="h-8 w-8 text-muted-foreground hover:text-primary" title="Run Diagnostics">
                <AlertCircle className="h-4 w-4" />
              </Button>
              {configs.length > 0 && (
                <Button variant="ghost" size="sm" onClick={resetForm} className="text-xs h-8 px-2.5">
                  <Plus className="h-3.5 w-3.5 mr-1" /> New
                </Button>
              )}
            </div>
          </div>
          
          {!isLoaded ? (
            <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center bg-muted/5">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground font-medium">Loading API configurations...</p>
            </Card>
          ) : configs.length === 0 ? (
            <Card className="border-dashed flex flex-col items-center justify-center p-8 text-center bg-muted/20">
              <Settings2 className="h-10 w-10 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">No configurations yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first one to start.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {configs.map(config => (
                <Card key={config.id} className={`transition-all duration-200 ${config.is_active ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'hover:border-primary/50'}`}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          {config.name}
                          {config.is_active && (
                            <Badge variant="default" className="h-4 px-1.5 text-[10px] uppercase font-bold">Active</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-[10px] font-mono truncate max-w-[180px]">
                          {config.endpoint}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter className="p-4 pt-2 flex justify-end gap-1.5 border-t bg-muted/30">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(config)} className="h-7 w-7" title="Edit">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteConfig(config.id)} className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {!config.is_active && (
                      <Button variant="secondary" size="sm" onClick={() => onApply(config.id)} className="h-7 text-xs px-2.5">
                        <Play className="h-3 w-3 mr-1.5" /> Apply
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Configuration Form */}
        <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
          <Card className="shadow-lg border-muted-foreground/20">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center gap-2">
                {isEditing ? <Edit2 className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                {isEditing ? `Edit Configuration: ${formState.name}` : 'Create New Configuration'}
              </CardTitle>
              <CardDescription>Configure the API details and test the connection before applying.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Configuration Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. My Custom GPT-4" 
                    value={formState.name}
                    onChange={e => setFormState(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth_type">Auth Type</Label>
                  <Select 
                    value={formState.auth_type} 
                    onValueChange={val => setFormState(prev => ({ ...prev, auth_type: val as any }))}
                  >
                    <SelectTrigger id="auth_type">
                      <SelectValue placeholder="Select auth type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formState.auth_type !== 'none' && (
                <div className="space-y-2 animate-in slide-in-from-left duration-300">
                  <Label htmlFor="apiKey">{formState.auth_type === 'bearer' ? 'Bearer Token' : 'API Key'}</Label>
                  <div className="relative">
                    <Input 
                      id="apiKey" 
                      type={showApiKey ? "text" : "password"}
                      placeholder={`Enter your ${formState.auth_type === 'bearer' ? 'token' : 'key'}`} 
                      className="pr-10"
                      value={formState.apiKey || ''}
                      onChange={e => setFormState(prev => ({ ...prev, apiKey: e.target.value }))}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 space-y-2">
                  <Label htmlFor="endpoint">Endpoint URL</Label>
                  <Input 
                    id="endpoint" 
                    placeholder="https://api.openai.com/v1/chat/completions" 
                    value={formState.endpoint}
                    onChange={e => setFormState(prev => ({ ...prev, endpoint: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Method</Label>
                  <Select 
                    value={formState.method} 
                    onValueChange={val => setFormState(prev => ({ ...prev, method: val as any }))}
                  >
                    <SelectTrigger id="method">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    Runtime Variables
                    <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Label>
                  <Button variant="outline" size="sm" onClick={addVariable} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add Variable
                  </Button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {(formState.variables || []).map((v) => (
                    <div key={v.id} className="flex gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{"{{"}</span>
                        <Input 
                          placeholder="name" 
                          value={v.key} 
                          onChange={(e) => updateVariable(v.id, 'key', e.target.value)}
                          className="pl-6 pr-6 h-9 text-xs"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{"}}"}</span>
                      </div>
                      <Input 
                        placeholder="Value" 
                        value={v.value} 
                        onChange={(e) => updateVariable(v.id, 'value', e.target.value)}
                        className="flex-1 h-9 text-xs"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeVariable(v.id)}
                        className="shrink-0 h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Headers</Label>
                  <Button variant="outline" size="sm" onClick={addHeader} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add Header
                  </Button>
                </div>
                <div className="space-y-2">
                  {formState.headers?.map((header, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input 
                        placeholder="Key" 
                        value={header.key} 
                        onChange={e => updateHeader(idx, 'key', e.target.value)}
                        className="flex-1"
                      />
                      <Input 
                        placeholder="Value" 
                        value={header.value} 
                        onChange={e => updateHeader(idx, 'value', e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeHeader(idx)} className="h-10 w-10 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    {formState.bodies && formState.bodies.length > 1 ? 'Request Bodies' : 'Request Body (JSON)'}
                    <FileJson className="w-3.5 h-3.5 text-muted-foreground" />
                  </Label>
                  <div className="flex gap-1">
                    {formState.bodies && formState.bodies.length === 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => addBody('text')} 
                        className="h-7 w-7 text-muted-foreground hover:text-primary transition-opacity opacity-50 hover:opacity-100"
                        title="Add New Body"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                    {formState.bodies && formState.bodies.length > 1 && (
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => addBody('text')} 
                          className="h-7 text-[10px] px-2"
                        >
                          <Plus className="h-3 w-3 mr-1" /> New Text Body
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => addBody('file')} 
                          className="h-7 text-[10px] px-2"
                        >
                          <FileJson className="h-3 w-3 mr-1" /> New File Body
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {formState.bodies && formState.bodies.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-4 bg-muted/30 p-2 rounded-lg border border-dashed border-border/60">
                    {formState.bodies.map(body => (
                      <div 
                        key={body.id} 
                        className={`flex items-center gap-1.5 p-1 px-2 rounded-md border transition-all cursor-pointer ${
                          activeBodyId === body.id 
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                          : 'bg-background hover:bg-muted border-border/40 text-muted-foreground'
                        }`}
                        onClick={() => setActiveBodyId(body.id)}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold leading-none flex items-center gap-1 truncate max-w-[120px]">
                            {body.name}
                            {body.is_default && <Star className="w-2.5 h-2.5 fill-current" />}
                            {body.type === 'file' && <FileJson className="w-2.5 h-2.5" />}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Input 
                        value={formState.bodies?.find(b => b.id === activeBodyId)?.name || ''}
                        onChange={(e) => renameBody(activeBodyId!, e.target.value)}
                        className="h-7 text-[11px] font-bold w-40 bg-transparent border-none shadow-none focus-visible:ring-0 p-0 hover:bg-muted/50 transition-colors"
                        placeholder="Body Name"
                      />
                      <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter h-5 px-1 bg-muted/50">
                        {formState.bodies?.find(b => b.id === activeBodyId)?.type || 'text'}
                      </Badge>
                      {formState.bodies?.find(b => b.id === activeBodyId)?.is_default && (
                        <Badge className="text-[9px] uppercase font-bold tracking-tighter h-5 px-1 bg-primary/10 text-primary border-primary/20">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {!(formState.bodies?.find(b => b.id === activeBodyId)?.is_default) && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-primary" 
                          onClick={() => setDefaultBody(activeBodyId!)}
                          title="Set as Default"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-primary" 
                        onClick={() => duplicateBody(activeBodyId!)}
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      {formState.bodies && formState.bodies.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-destructive" 
                          onClick={() => removeBody(activeBodyId!)}
                          title="Delete Body"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-1 border ring-1 ring-border/20 shadow-inner">
                    <Textarea 
                      id="jsonBody" 
                      rows={8}
                      className="font-mono text-sm border-none shadow-none focus-visible:ring-0"
                      placeholder='{ "model": "gpt-3.5-turbo" }'
                      value={jsonBody}
                      onChange={e => handleJsonChange(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground px-1 italic">
                    Tip: Use {"{{user_input}}"} in your body template to bind the chat input message. The "Default" body is used for standard chat.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responseField">Response Field (dot notation)</Label>
                <Input 
                  id="responseField" 
                  placeholder="choices[0].message.content" 
                  value={formState.responseField}
                  onChange={e => setFormState(prev => ({ ...prev, responseField: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground px-1">
                  Specify where to find the text response in the API output.
                </p>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t flex flex-wrap justify-between p-6 gap-4">
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleTestRequest} disabled={isTesting}>
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Test Request
                    </>
                  )}
                </Button>
                <Button onClick={handleSave}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update Configuration' : 'Save Configuration'}
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Test Results Section */}
          {showTestPanel && (
            <Card className="border-border/60 shadow-sm overflow-hidden animate-in slide-in-from-bottom duration-500">
              <CardHeader className="bg-muted/30 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Braces className="w-5 h-5 text-primary" />
                      Test Results
                    </CardTitle>
                    <CardDescription>Inspect the response from your test request.</CardDescription>
                  </div>
                  {testStatus && (
                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      testStatus < 300 ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
                    }`}>
                      {testStatus < 300 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      HTTP {testStatus}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {testError && (
                  <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-lg flex gap-3 text-destructive">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-bold">Request Failed</p>
                      <p className="opacity-90">{testError}</p>
                    </div>
                  </div>
                )}

                <Tabs defaultValue="structured" className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-muted/50">
                      <TabsTrigger value="structured" className="gap-1.5 h-8 text-xs">
                        <Braces className="w-3.5 h-3.5" /> Structured
                      </TabsTrigger>
                      <TabsTrigger value="raw" className="gap-1.5 h-8 text-xs">
                        <Code2 className="w-3.5 h-3.5" /> Raw
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <div className="bg-muted/20 rounded-lg border border-border/40 overflow-hidden min-h-[200px] max-h-[400px]">
                    <TabsContent value="structured" className="m-0 h-full overflow-auto p-4 font-mono text-xs">
                      {testResponse ? (
                        <pre className="text-foreground">
                          {JSON.stringify(testResponse, null, 2)}
                        </pre>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground opacity-50 py-10">
                          Waiting for response...
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="raw" className="m-0 h-full overflow-auto p-4 font-mono text-xs">
                      {testResponse ? (
                        <div className="whitespace-pre-wrap break-all text-muted-foreground">
                          {typeof testResponse === 'string' ? testResponse : JSON.stringify(testResponse)}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground opacity-50 py-10">
                          Waiting for response...
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Data Extractor</Label>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input 
                        placeholder="path.to.data (e.g. data.user.email)" 
                        className="h-9 text-xs pl-8"
                        value={responsePath}
                        onChange={(e) => handlePathChange(e.target.value)}
                      />
                      <Code2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
                    </div>
                  </div>
                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 min-h-[44px] flex items-center overflow-x-auto">
                    {extractedValue !== undefined && extractedValue !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-primary opacity-60 shrink-0">Value:</span>
                        <code className="text-xs font-mono font-bold text-primary whitespace-nowrap">
                          {typeof extractedValue === 'object' ? JSON.stringify(extractedValue) : String(extractedValue)}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-1.5 ml-auto text-[10px]"
                          onClick={() => {
                            setFormState(prev => ({ ...prev, responseField: responsePath }));
                            toast.success(`Mapping updated to: ${responsePath}`);
                          }}
                        >
                          Use as Response Field
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">No value extracted</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2rem] overflow-hidden mt-8">
        <CardHeader className="p-8 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl">
              <Settings2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Chatbot Connections</CardTitle>
              <CardDescription className="text-white/60">Assign and manage multiple APIs per chatbot. The first selected API is the default.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isLoaded ? (
              API_MODULES.map((module) => {
                const chatbot = chatbots.find(c => c.id === module.id);
                const connectedApiIds = chatbot?.api_ids || [];
                const connectedConfigs = connectedApiIds
                  .map(id => configs.find(c => c.id === id))
                  .filter(Boolean) as ApiConfig[];

                return (
                  <Card key={module.id} className="bg-white/5 border-white/10 rounded-3xl overflow-hidden hover:border-white/20 transition-all group">
                    <CardHeader className="p-5 border-b border-white/10 bg-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/20">
                            <Send className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-bold text-white">{module.name}</span>
                        </div>
                        <Badge variant="outline" className="border-white/20 text-white/60">
                          {connectedConfigs.length} APIs
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      {connectedConfigs.length > 0 ? (
                        <div className="space-y-3">
                          {connectedConfigs.map((config, idx) => (
                            <div key={config.id} className="flex items-center justify-between gap-2 p-3 bg-white/5 rounded-2xl border border-white/10">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-white/90">{config.name}</span>
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                                  {idx === 0 ? 'Primary / Default' : `Alternative ${idx}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {idx === 0 && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                  onClick={() => {
                                    const nextApiIds = connectedApiIds.filter(id => id !== config.id);
                                    connectModule(module.id, nextApiIds);
                                  }}
                                >
                                  <Trash2 className="h-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">No APIs Assigned</p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-5 pt-0">
                      <Select
                        onValueChange={(val) => {
                          if (connectedApiIds.includes(val)) return;
                          connectModule(module.id, [...connectedApiIds, val]);
                        }}
                      >
                        <SelectTrigger className="w-full bg-white/10 border-none rounded-xl text-white text-xs hover:bg-white/20">
                          <SelectValue placeholder="Add API..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white rounded-xl">
                          {configs.map(c => (
                            <SelectItem key={c.id} value={c.id} className="focus:bg-white/10 focus:text-white" disabled={connectedApiIds.includes(c.id)}>
                              {c.name} {connectedApiIds.includes(c.id) ? '(Connected)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardFooter>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center">
                <Loader2 className="w-8 h-8 text-white/30 animate-spin mx-auto mb-4" />
                <p className="text-white/60">Loading chatbot connections...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiConfigPage;
