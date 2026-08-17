import { useState, useEffect, useCallback } from 'react';
import { ApiConfig, Chatbot } from '@/types';
import { api } from '@/db/api';
import { toast } from 'sonner';

export type ApiModule = {
  id: string;
  name: string;
}

export const API_MODULES: ApiModule[] = [
  { id: 'ai-chat', name: 'AI Chat' },
  { id: 'study-ai', name: 'Study AI' },
  { id: 'dashboard', name: 'User Dashboard' }
];

export const useApiConfigs = () => {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<ApiConfig | null>(null);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [configRes, chatbotRes] = await Promise.all([
        api.getApiConfigs(),
        api.getChatbots()
      ]);

      if (configRes.error) throw configRes.error;
      if (chatbotRes.error) throw chatbotRes.error;

      setConfigs(configRes.data || []);
      setChatbots(chatbotRes.data || []);
      
      const active = (configRes.data || []).find(c => c.is_active);
      if (active) setActiveConfig(active);
      
      setIsLoaded(true);
    } catch (e: any) {
      console.error('Failed to load API configs', e);
      toast.error('Failed to load API configurations');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addConfig = async (config: Omit<ApiConfig, 'id' | 'created_at' | 'last_applied' | 'is_active'>) => {
    const { data, error } = await api.createApiConfig(config);
    if (error) {
      console.error('Failed to add API configuration', error);
      toast.error('Failed to add configuration');
      throw error;
    }
    if (data) {
      console.log('API Toolkit: Configuration added', data.id);
      setConfigs(prev => {
        const next = [data, ...prev];
        console.log('API Toolkit: Configurations Count:', next.length);
        return next;
      });
      return data;
    }
    return null;
  };

  const updateConfig = async (id: string, updates: Partial<ApiConfig>) => {
    const { data, error } = await api.updateApiConfig(id, updates);
    if (error) {
      console.error('Failed to update API configuration', error);
      toast.error('Failed to update configuration');
      throw error;
    }
    if (data) {
      console.log('API Toolkit: Configuration updated', id);
      setConfigs(prev => {
        const next = prev.map(c => c.id === id ? data : c);
        console.log('API Toolkit: Configurations Count:', next.length);
        return next;
      });
      if (data.is_active) setActiveConfig(data);
    }
  };

  const deleteConfig = async (id: string) => {
    const { error } = await api.deleteApiConfig(id);
    if (error) {
      console.error('Failed to delete API configuration', error);
      toast.error('Failed to delete configuration');
      throw error;
    }
    console.log('API Toolkit: Configuration deleted', id);
    setConfigs(prev => {
      const next = prev.filter(c => c.id !== id);
      console.log('API Toolkit: Configurations Count:', next.length);
      return next;
    });
    if (activeConfig?.id === id) setActiveConfig(null);
  };

  const applyConfig = async (id: string) => {
    const configToApply = configs.find(c => c.id === id);
    if (!configToApply) throw new Error('Configuration not found');

    // Test request
    try {
      // Build headers — same logic as the manual test in ApiConfigPage
      const headersObj: Record<string, string> = configToApply.headers.reduce((acc: any, h) => {
        if (h.key) acc[h.key] = h.value;
        return acc;
      }, {});

      // ── CRITICAL FIX: inject auth credentials before the connection test ──
      if (configToApply.apiKey && configToApply.auth_type !== 'none') {
        if (configToApply.auth_type === 'bearer') {
          headersObj['Authorization'] = `Bearer ${configToApply.apiKey}`;
        } else if (configToApply.auth_type === 'api_key') {
          headersObj['X-API-Key'] = configToApply.apiKey;
        }
      }

      const defaultBody = configToApply.bodies.find(b => b.is_default) || configToApply.bodies[0];

      const response = await fetch(configToApply.endpoint, {
        method: configToApply.method,
        headers: headersObj,
        body: configToApply.method !== 'GET' && defaultBody ? JSON.stringify(defaultBody.content) : undefined,
      });

      // 401/403 specifically means bad/missing credentials — surface a clear message
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Connection test failed: HTTP ${response.status} — Check your API key / Bearer token.`);
      }

      // 400/422 means the server is reachable and credentials passed — body was just invalid
      // This is acceptable for a connection test (minimal body may not be a valid prompt)
      if (!response.ok && response.status !== 400 && response.status !== 422) {
        throw new Error(`Connection test failed: HTTP ${response.status}`);
      }

      // Update is_active in DB
      // First deactivate all
      await Promise.all(configs.map(c => api.updateApiConfig(c.id, { is_active: false })));
      // Then activate this one
      const { data, error } = await api.updateApiConfig(id, { 
        is_active: true,
        last_applied: new Date().toISOString()
      });

      if (error) throw error;
      
      if (data) {
        setConfigs(prev => prev.map(c => ({
          ...c,
          is_active: c.id === id,
          last_applied: c.id === id ? data.last_applied : c.last_applied
        })));
        setActiveConfig(data);
      }
      
      toast.success('Configuration applied successfully');
      return true;
    } catch (e: any) {
      toast.error(`Test request failed: ${e.message}`);
      throw new Error(`Test request failed: ${e.message}`);
    }
  };

  const connectModule = async (moduleId: string, apiIds: string[]) => {
    const { data, error } = await api.updateChatbotApiIds(moduleId, apiIds);
    if (error) {
      toast.error('Failed to update connections');
      throw error;
    }
    if (data) {
      setChatbots(prev => prev.map(c => c.id === moduleId ? data : c));
      toast.success('Connections updated');
    }
  };

  const getModuleConfig = useCallback((moduleId: string) => {
    const chatbot = chatbots.find(c => c.id === moduleId);
    if (chatbot && chatbot.api_ids && chatbot.api_ids.length > 0) {
      const primaryApiId = chatbot.api_ids[0];
      return configs.find(c => c.id === primaryApiId) || activeConfig;
    }
    return activeConfig;
  }, [chatbots, configs, activeConfig]);

  return {
    configs,
    activeConfig,
    chatbots,
    isLoaded,
    addConfig,
    updateConfig,
    deleteConfig,
    applyConfig,
    connectModule,
    getModuleConfig,
    API_MODULES
  };
};
