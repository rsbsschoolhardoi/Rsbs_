import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { ModuleSetting } from '@/types';

interface PublicSettingsContextType {
  moduleSettings: ModuleSetting[];
  isModuleEnabled: (moduleId: string) => boolean;
  loading: boolean;
}

export const PublicSettingsContext = createContext<PublicSettingsContextType | undefined>(undefined);

export function PublicSettingsProvider({ children }: { children: ReactNode }) {
  const [moduleSettings, setModuleSettings] = useState<ModuleSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Only fetch global module settings for the Public App
      const { data, error } = await supabase
        .from('module_settings')
        .select('*')
        .is('user_id', null)
        .is('role', null);
        
      if (error) throw error;
      setModuleSettings(data || []);
    } catch (err) {
      console.error('Failed to fetch public module settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const isModuleEnabled = useCallback((moduleId: string) => {
    const globalSetting = moduleSettings.find(s => s.module_id === moduleId && !s.role && !s.user_id);
    if (globalSetting) return globalSetting.is_enabled && globalSetting.state !== 'deactivated';
    return true;
  }, [moduleSettings]);

  const contextValue = useMemo(() => ({ moduleSettings, isModuleEnabled, loading }), [moduleSettings, isModuleEnabled, loading]);

  useEffect(() => {
    fetchData();

    const moduleChannel = supabase
      .channel('public-module-settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'module_settings' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      moduleChannel.unsubscribe();
    };
  }, []);

  return (
    <PublicSettingsContext.Provider value={contextValue}>
      {children}
    </PublicSettingsContext.Provider>
  );
}

export function usePublicSettings() {
  const context = useContext(PublicSettingsContext);
  if (context === undefined) {
    throw new Error('usePublicSettings must be used within a PublicSettingsProvider');
  }
  return context;
}
