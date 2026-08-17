/**
 * trustedDeviceApi
 * ────────────────
 * Server-backed trusted device / saved account management.
 * No passwords, PINs, or tokens are persisted in the browser.
 * The actual session token exchange is handled via a short-lived
 * magic-link token returned by the trusted-device Edge Function.
 */
import { edgeSupabase } from '@/db/edgeClient';
import { supabase } from '@/db/supabase';

export type SavedAccountRole = 'student' | 'teacher' | 'parent';

export interface SavedAccount {
  profileId: string;    // internal Supabase auth user / profile id
  username: string;     // login credential (e.g. RSBS7991)
  fullName: string;
  loginId: string;      // displayed secondary identifier
  verificationId: string; // internal verification identifier
  role: SavedAccountRole;
  avatarUrl?: string;
  pinVerified: boolean;
  otpVerified: boolean;
  savedAt: number;
}

interface SavedAccountRow {
  profile_id: string;
  login_id: string;
  verification_id: string;
  full_name: string;
  role: SavedAccountRole;
  avatar_url?: string;
  pin_verified: boolean;
  otp_verified: boolean;
  updated_at: string;
}

function mapRow(row: SavedAccountRow): SavedAccount {
  return {
    profileId: row.profile_id,
    username: row.login_id || row.verification_id,
    fullName: row.full_name,
    loginId: row.login_id || row.verification_id,
    verificationId: row.verification_id,
    role: row.role,
    avatarUrl: row.avatar_url || undefined,
    pinVerified: row.pin_verified,
    otpVerified: row.otp_verified,
    savedAt: new Date(row.updated_at).getTime(),
  };
}

async function invoke(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await edgeSupabase.functions.invoke('trusted-device', {
    body: { action, ...payload },
  });

  if (error) {
    const message = (error as any).context?.text?.() || error.message || 'Device service error';
    throw new Error(message);
  }
  return data;
}

export async function listSavedAccounts(): Promise<SavedAccount[]> {
  const data = await invoke('list');
  return ((data as any).accounts || []).map((row: SavedAccountRow) => mapRow(row));
}

export async function addSavedAccount(
  account: Omit<SavedAccount, 'savedAt'>
): Promise<SavedAccount> {
  const data = await invoke('add', {
    profile_id: account.profileId,
    role: account.role,
    full_name: account.fullName,
    login_id: account.loginId || account.username || account.verificationId,
    verification_id: account.verificationId,
    avatar_url: account.avatarUrl || null,
    pin_verified: account.pinVerified,
    otp_verified: account.otpVerified,
  });
  return mapRow((data as any).account);
}

export async function removeSavedAccount(profileId: string): Promise<void> {
  await invoke('remove', { profile_id: profileId });
}

export async function logoutSavedAccount(profileId: string): Promise<void> {
  await invoke('logout', { profile_id: profileId });
}

export async function switchSavedAccount(profileId: string): Promise<void> {
  const data = await invoke('switch', { profile_id: profileId });
  const { hashed_token } = data as { hashed_token: string };

  const { error } = await supabase.auth.verifyOtp({
    token_hash: hashed_token,
    type: 'magiclink',
  });

  if (error) {
    throw new Error(error.message || 'Failed to verify secure switch token');
  }
}
