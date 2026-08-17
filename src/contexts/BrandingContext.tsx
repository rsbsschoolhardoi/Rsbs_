/**
 * BrandingContext
 *
 * Single source of truth for school branding across the entire app.
 * — Fetched once on mount, cached in memory.
 * — Exposes `branding` (or null while loading) and `refresh()`.
 * — TemplateStudio reads `branding` to pre-fill document variables so
 *   templates automatically reflect the latest school settings.
 */
import {
  createContext, useContext, useEffect, useState,
  useCallback, useMemo, type ReactNode,
} from 'react';
import { api } from '@/db/api';
import type { BrandingSettings } from '@/types';

interface BrandingContextType {
  branding: BrandingSettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading]   = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await api.getBrandingSettings();
    setBranding(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(
    () => ({ branding, loading, refresh }),
    [branding, loading, refresh],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
}
