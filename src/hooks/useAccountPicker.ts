/**
 * useAccountPicker
 * ─────────────────
 * Manages the list of saved accounts for the current device.
 * Accounts are stored server-side via the trusted-device Edge Function.
 * No passwords, PINs, access tokens or refresh tokens are ever stored.
 */
import { useState, useCallback, useEffect } from 'react';
import {
  listSavedAccounts,
  addSavedAccount,
  removeSavedAccount,
  switchSavedAccount,
  type SavedAccount,
  type SavedAccountRole,
} from '@/lib/trustedDeviceApi';

export type { SavedAccount, SavedAccountRole };

export function useAccountPicker(roleFilter?: SavedAccountRole) {
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filter = useCallback((all: SavedAccount[]) => {
    return roleFilter ? all.filter(a => a.role === roleFilter) : all;
  }, [roleFilter]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await listSavedAccounts();
      setAccounts(filter(all));
    } catch (err: any) {
      setError(err.message || 'Failed to load saved accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveAccount = useCallback(async (account: Omit<SavedAccount, 'savedAt'>) => {
    try {
      await addSavedAccount(account);
      await reload();
    } catch (err: any) {
      setError(err.message || 'Failed to save account');
      throw err;
    }
  }, [reload]);

  const removeAccount = useCallback(async (profileId: string) => {
    try {
      await removeSavedAccount(profileId);
      await reload();
    } catch (err: any) {
      setError(err.message || 'Failed to remove account');
      throw err;
    }
  }, [reload]);

  const switchAccount = useCallback(async (profileId: string) => {
    try {
      await switchSavedAccount(profileId);
      await reload();
    } catch (err: any) {
      setError(err.message || 'Failed to switch account');
      throw err;
    }
  }, [reload]);

  const hasAccount = useCallback((profileId: string) => {
    return accounts.some(a => a.profileId === profileId);
  }, [accounts]);

  return {
    accounts,
    loading,
    error,
    saveAccount,
    removeAccount,
    switchAccount,
    hasAccount,
    reload,
  };
}
