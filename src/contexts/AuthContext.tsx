import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile, ModuleSetting, StudentSession, Student } from '@/types';
import { toast } from 'sonner';
import { api } from '@/db/api';
import {
  addSavedAccount,
  removeSavedAccount,
  listSavedAccounts,
  switchSavedAccount,
  type SavedAccount,
} from '@/lib/trustedDeviceApi';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    console.error('Failed to fetch profile:', error);
    return null;
  }

  const profile = data as Profile;

  // Enrich student profiles with the canonical student record so the UI can show
  // real names, profile photos, and login IDs without second-guessing the data.
  if (profile.role === 'student' && profile.student_id) {
    const { data: student } = await supabase
      .from('students')
      .select('name, profile_picture_url, verification_id, login_id')
      .eq('id', profile.student_id)
      .maybeSingle();

    const s = student as { name?: string; profile_picture_url?: string; verification_id?: string; login_id?: string } | null;
    if (s) {
      return {
        ...profile,
        student_name: s.name,
        avatar_url: s.profile_picture_url || profile.avatar_url,
        verification_id: s.verification_id,
        login_id: s.login_id,
      };
    }
  }

  return profile;
}

export async function getStudent(studentId: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch student:', error);
    return null;
  }
  return data as Student | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  moduleSettings: ModuleSetting[];
  loading: boolean;
  isRestoringSession: boolean;
  currentSessionId: string | null;
  isPinVerified: boolean;
  isOtpVerified: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: (redirectTo?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  isModuleEnabled: (moduleId: string) => boolean;
  verifyPIN: (pin: string) => Promise<{ success: boolean; message?: string }>;
  updatePIN: (newPin: string) => Promise<{ error: Error | null }>;
  verifyOTP: (otp: string) => Promise<{ success: boolean; message?: string; remainingAttempts?: number }>;
  sendOTP: () => Promise<{ success: boolean; message?: string; email?: string; cooldown?: number }>;
  shouldRequireOTP: (p?: Profile | null) => Promise<boolean>;
  checkAuthStatus: () => 'loading' | 'unauthenticated' | 'need-pin' | 'need-otp' | 'need-verification' | 'restricted' | 'authenticated';
  isOtpRequired: boolean;
  isPinRequired: boolean;
  trustDevice: (account: Omit<SavedAccount, 'savedAt'>) => Promise<void>;
  untrustDevice: (profileId?: string) => Promise<void>;
  switchAccount: (profileId: string) => Promise<{ success: boolean; message?: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [moduleSettings, setModuleSettings] = useState<ModuleSetting[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(localStorage.getItem('current_session_id'));
  // isPinVerified is ONLY true when the user verified PIN in this page-load session.
  // We do NOT initialise from sessionStorage here — sessionStorage is consulted
  // only when we are restoring an already-authenticated session (page refresh),
  // not on a brand-new SIGNED_IN event. The flag is explicitly set per-event below.
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isOtpRequired, setIsOtpRequired] = useState(false);
  const [isPinRequired, setIsPinRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Once the initial getSession() completes we flip this ref.
  // After that, SIGNED_IN events from onAuthStateChange mean the token was
  // silently refreshed for the SAME user — we must NOT show the loading
  // spinner or remount pages for that.
  const initialLoadDone = useRef(false);
  // Tracks the currently-loaded user's id so SIGNED_IN events for the same
  // user (tab-refocus silent re-auth) can be skipped without reading state.
  const currentUserIdRef = useRef<string | null>(null);
  // Keep a fresh reference to the loaded profile so the auth-state listener
  // can decide whether a silent SIGNED_IN needs a full reload.
  const profileRef = useRef<Profile | null>(null);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase.from('module_settings').select('*');
      if (error) throw error;
      setModuleSettings(data || []);
    } catch (err) {
      console.error('Failed to fetch module settings:', err);
    }
  };

  const restoreTrustedVerification = useCallback(async (userId: string) => {
    try {
      const saved = await listSavedAccounts();
      const match = saved.find(a => a.profileId === userId);
      if (match) {
        setIsPinVerified(match.pinVerified);
        setIsOtpVerified(match.otpVerified);
      }
    } catch (err) {
      console.warn('Failed to restore trusted verification state:', err);
    }
  }, []);

  const isModuleEnabled = useCallback((moduleId: string) => {
    // 0. Master Admin Priority Bypass (Requirement 5)
    // Master Admins have all permissions enabled by default, 
    // but can toggle them for preferences (Requirement 4).
    if (profile?.is_master) {
      return profile.permissions?.includes(moduleId);
    }

    // 1. Admin Individual check (Requirement 4 in previous sessions)
    if (profile?.role === 'admin' && profile?.permissions?.includes(moduleId)) return true;
    
    // Check order: Individual -> Role -> Global
    
    // 1. Individual check (Profile ID level)
    const individualSetting = moduleSettings.find(s => s.module_id === moduleId && s.user_id === profile?.id);
    if (individualSetting) return individualSetting.is_enabled && individualSetting.state !== 'deactivated';
    
    // 2. Role check
    const roleSetting = moduleSettings.find(s => s.module_id === moduleId && s.role === profile?.role && !s.user_id);
    if (roleSetting) return roleSetting.is_enabled && roleSetting.state !== 'deactivated';
    
    // 3. Global check
    const globalSetting = moduleSettings.find(s => s.module_id === moduleId && !s.role && !s.user_id);
    if (globalSetting) return globalSetting.is_enabled && globalSetting.state !== 'deactivated';

    return false; // Default to disabled if no setting found
  }, [profile, moduleSettings]);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await getProfile(user.id);
    setProfile(profileData);

    // Check PIN requirement
    const pinNeeded = profileData?.role !== 'admin' && (profileData?.pin_setup_required || !profileData?.pin);
    setIsPinRequired(!!pinNeeded);

    // Check OTP requirement
    const otpNeeded = await shouldRequireOTP(profileData);
    setIsOtpRequired(otpNeeded);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const persistTrust = useCallback(async (userId: string, profileData: Profile | null, otpVerified: boolean) => {
    try {
      await addSavedAccount({
        profileId: userId,
        username: profileData?.verification_id || profileData?.username || '',
        fullName:
          profileData?.student_name ||
          profileData?.teacher_name ||
          profileData?.parent_name ||
          profileData?.username ||
          '',
        verificationId: profileData?.verification_id || profileData?.username || '',
        role: profileData?.role as SavedAccount['role'] || 'student',
        avatarUrl: profileData?.avatar_url || undefined,
        pinVerified: isPinVerified,
        otpVerified,
      });
    } catch (err) {
      console.warn('Failed to persist trust state:', err);
    }
  }, [isPinVerified]);

  const checkAuthStatus = useCallback(() => {
    if (loading) return 'loading';
    if (!user || !profile) return 'unauthenticated';
    
    // Requirement 3: Account Status Restriction
    if (profile.role === 'admin' && profile.account_status === 'restricted') {
      return 'restricted'; // Add this status
    }
    
    // Requirement 1 & 2: Admin Email Verification check
    if (profile.role === 'admin' && !profile.email_verified && !profile.is_master) {
      return 'need-verification';
    }
    
    // Admins are exempt from extra verification steps (PIN/OTP)
    if (profile.role === 'admin') return 'authenticated';
    
    // Sequential Verification (Step-by-Step)
    // 1. PIN Check
    if ((isPinRequired || !isPinVerified)) return 'need-pin';
    
    // 2. OTP Check (only after PIN)
    if (isOtpRequired && !isOtpVerified) return 'need-otp';
    
    return 'authenticated';
  }, [loading, user, profile, isPinRequired, isPinVerified, isOtpRequired, isOtpVerified]);

  useEffect(() => {
    fetchData();

    const moduleChannel = supabase
      .channel('module-settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'module_settings' }, () => {
        fetchData();
      })
      .subscribe();

    // ── Initial session check (runs ONCE on mount) ───────────────────────────
    setIsRestoringSession(true);
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          currentUserIdRef.current = session.user.id;
          setUser(session.user);
          const profileData = await getProfile(session.user.id);
          setProfile(profileData);
          const pinNeeded = profileData?.role !== 'admin' && (profileData?.pin_setup_required || !profileData?.pin);
          setIsPinRequired(!!pinNeeded);
          const otpNeeded = await shouldRequireOTP(profileData);
          setIsOtpRequired(otpNeeded);
          // Page-refresh: restore verification flags from the trusted-device
          // record. A genuinely fresh login goes through onAuthStateChange below
          // and always starts unverified.
          await restoreTrustedVerification(session.user.id);
        }
      })
      .catch(error => {
        console.error(`Session check failed: ${error.message}`);
      })
      .finally(() => {
        initialLoadDone.current = true;
        setLoading(false);
        setIsRestoringSession(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Silent events — never show a spinner for these
      if (_event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED') return;

      // SIGNED_IN: could be (a) boot-time restore, (b) tab-refocus re-auth,
      // or (c) a genuinely new login from a different user.
      if (_event === 'SIGNED_IN' && session?.user) {
        // (a) Boot-time: getSession() is still running — it will handle this
        if (!initialLoadDone.current) return;
        // (b) Same user silently re-authenticated (tab-refocus / token rotation).
        //     If we already have a profile, this is just a token refresh; keep
        //     the existing page state without any loading spinner or redirect.
        if (currentUserIdRef.current === session.user.id && profileRef.current) {
          setUser(session.user); // keep token fresh, no profile re-fetch
          setLoading(false);     // account switch may have set loading true
          return;
        }
        // (c) Genuinely new login (new user OR same user after sign-out) —
        //     fall through to full load below and always start unverified.
      }

      if (session?.user) {
        // Full sign-in for a new user (or same user after sign-out).
        setLoading(true);
        currentUserIdRef.current = session.user.id;
        setUser(session.user);
        const p = await getProfile(session.user.id);
        if (p && p.login_access_enabled === false) {
          await supabase.auth.signOut();
          setUser(null); setProfile(null);
          currentUserIdRef.current = null;
          setLoading(false);
          toast.error('Login access is currently disabled. Please contact your administrator.');
          return;
        }
        setProfile(p);
        const pinNeeded = p?.role !== 'admin' && (p?.pin_setup_required || !p?.pin);
        setIsPinRequired(!!pinNeeded);
        const otpNeeded = await shouldRequireOTP(p);
        setIsOtpRequired(otpNeeded);
        // For a fresh password login no saved account exists yet, so verification
        // stays false and the PIN/OTP flow runs. For a trusted-account switch, the
        // saved record carries the verified flags and we restore them here so the
        // dashboard opens immediately.
        await restoreTrustedVerification(session.user.id);
        setLoading(false);
      } else {
        // SIGNED_OUT
        currentUserIdRef.current = null;
        setUser(null); setProfile(null);
        setCurrentSessionId(null);
        setIsPinRequired(false); setIsOtpRequired(false);
        setIsPinVerified(false); setIsOtpVerified(false);
        localStorage.removeItem('current_session_id');
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      moduleChannel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Activity Tracking & Session Monitoring
    // Runs when session/user/profile changes
    let sessionChannel: any;
    let studentChannel: any;
    let globalChannel: any;

    if (currentSessionId) {
      sessionChannel = supabase
        .channel(`session-${currentSessionId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'student_sessions',
          filter: `id=eq.${currentSessionId}` 
        }, (payload) => {
          if (payload.new.status === 'forced_logout') {
            toast.error('Session terminated by Master Admin');
            signOut();
          }
        })
        .subscribe();
    }

    if (profile?.student_id) {
      studentChannel = supabase
        .channel(`student-${profile.student_id}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'students',
          filter: `id=eq.${profile.student_id}` 
        }, (payload) => {
          if (payload.new.is_blocked) {
            toast.error(`Your account has been blocked: ${payload.new.block_reason || 'No reason provided'}`);
            signOut();
          }
          // Real-time synchronization for student data (fees, etc)
          window.dispatchEvent(new CustomEvent('student-data-updated', { detail: payload.new }));
        })
        .subscribe();
    }

    // Unified Global Real-time Synchronization
    globalChannel = supabase
      .channel('global-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, (payload) => {
        window.dispatchEvent(new CustomEvent('attendance-updated', { detail: payload }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, (payload) => {
        window.dispatchEvent(new CustomEvent('notices-updated', { detail: payload }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timetable_entries' }, (payload) => {
        window.dispatchEvent(new CustomEvent('timetable-updated', { detail: payload }));
      })
      .subscribe();

    // ── Inactivity Logout Management ────────────────────────────────────────
    // We track the last-active wall-clock timestamp in a ref so the
    // visibilitychange handler can compare elapsed time without relying on
    // a running setTimeout (which pauses in background tabs in some browsers).
    const INACTIVITY_LIMIT = 2 * 60 * 60 * 1000; // 2 hours
    let lastActiveAt = Date.now();
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleInactivityLogout = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (!user) return;
      const remaining = INACTIVITY_LIMIT - (Date.now() - lastActiveAt);
      if (remaining <= 0) {
        toast.info('Session expired due to inactivity');
        signOut();
        return;
      }
      inactivityTimer = setTimeout(() => {
        toast.info('Session expired due to inactivity');
        signOut();
      }, remaining);
    };

    const onUserActivity = () => {
      lastActiveAt = Date.now();
      scheduleInactivityLogout();
    };

    // When the tab comes back into view, check elapsed time first.
    // If within the limit → just reschedule the timer (no loading, no refresh).
    // If over the limit → sign out gracefully.
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const elapsed = Date.now() - lastActiveAt;
      if (elapsed >= INACTIVITY_LIMIT) {
        toast.info('Session expired due to inactivity');
        signOut();
      } else {
        // Still within session window — reschedule remaining time silently.
        scheduleInactivityLogout();
      }
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    if (user) {
      activityEvents.forEach(ev => window.addEventListener(ev, onUserActivity));
      document.addEventListener('visibilitychange', onVisibilityChange);
      scheduleInactivityLogout();
    }

    const activityInterval = setInterval(() => {
      if (currentSessionId && user) {
        api.updateStudentSessionActivity(currentSessionId);
      }
    }, 60000);

    return () => {
      if (sessionChannel) sessionChannel.unsubscribe();
      if (studentChannel) studentChannel.unsubscribe();
      if (globalChannel) globalChannel.unsubscribe();
      if (inactivityTimer) clearTimeout(inactivityTimer);
      activityEvents.forEach(ev => window.removeEventListener(ev, onUserActivity));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(activityInterval);
    };
  }, [currentSessionId, profile?.student_id, user]);

  const signInWithUsername = useCallback(async (username: string, password: string) => {
    try {
      // 1. Determine if the input is an email or a username/ID
      let email = username.trim().toLowerCase();
      const isEmailInput = email.includes('@');
      const isSecondaryLoginEnabled = isModuleEnabled('secondary_login_id');

      if (isEmailInput && !isSecondaryLoginEnabled) {
        throw new Error('Login via email is currently disabled. Please use your school-provided Login ID.');
      }

      if (!isEmailInput) {
        // Resolve ID to its registered email
        const { data: lookup } = await supabase
          .from('all_user_emails_lookup')
          .select('email')
          .eq('ident', username)
          .maybeSingle();
        
        const typedLookup = lookup as { email: string } | null;
        email = typedLookup?.email || `${username.toLowerCase()}@miaoda.com`;
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Authentication failed');

      // Check if blocked immediately after login
      const profile = await getProfile(data.user.id);

      // Requirement 3: System-wide Login Access check
      if (profile && profile.login_access_enabled === false) {
        await supabase.auth.signOut();
        throw new Error('Login access is currently disabled. Please contact your administrator.');
      }
      
      // Requirement 2 & 3: Admin Account Activation check
      if (profile?.role === 'admin' && profile.account_status === 'restricted') {
        await supabase.auth.signOut();
        throw new Error('Your account is not yet activated. Please contact the system administrator.');
      }

      // Requirement 2: Block login for unverified admins
      if (profile?.role === 'admin' && !profile.email_verified && !profile.is_master) {
        await supabase.auth.signOut();
        throw new Error('Login restricted. Please verify your email address first. Check your inbox for the verification link.');
      }

      if (profile?.student_id) {
        const student = await getStudent(profile.student_id);
        if (student?.status !== 'active' || student?.is_blocked) {
          await supabase.auth.signOut();
          const reason = student?.status !== 'active' ? 'Account is not active' : (student.block_reason || 'Contact administrator');
          throw new Error(`Your account is temporarily blocked: ${reason}`);
        }

        // Create student session
        const { data: sessionData, error: sessionError } = await api.createStudentSession({
          student_id: profile.student_id,
          profile_id: profile.id,
          login_id: student?.login_id || username,
          student_name: student?.name || username,
          device_info: navigator.userAgent,
          ip_address: 'Hidden for privacy',
        });

        if (!sessionError && sessionData) {
          setCurrentSessionId(sessionData.id);
          localStorage.setItem('current_session_id', sessionData.id);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModuleEnabled]);

  const shouldRequireOTP = useCallback(async (p?: Profile | null) => {
    const profileToUse = p || profile;
    if (!profileToUse) return false;

    // Requirement 10: Administrator Role Exception (Non-Negotiable)
    if (profileToUse.role === 'admin') return false;

    try {
      // 1. Fetch Global Settings
      const { data: globalSettings } = await api.getEmailOtpSettings();
      const roleKey = `otp_${profileToUse.role}_enabled`;
      const globalEnabled = globalSettings[roleKey] ?? false;

      // Requirement 11: If globally disabled, return false
      if (!globalEnabled) return false;

      // Requirement 4: Decision Logic
      const userEnabled = profileToUse.email_otp_enabled ?? false;
      const isVerified = profileToUse.email_verified ?? false;

      // Condition: Global Toggle AND User Setting AND NOT Verified
      return userEnabled && !isVerified;
    } catch (err) {
      // Requirement 12: Fallback to false on error (No Lockout)
      console.error('OTP system fallback:', err);
      return false;
    }
  }, [profile]);

  const sendOTP = useCallback(async () => {
    if (!user) return { success: false, message: 'Session expired' };
    
    // Generate 6-digit OTP (Requirement 4.2)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash it for storage (Requirement 4.3)
    // We'll use SHA-256 for the hash as implemented in Postgres digest()
    const msgUint8 = new TextEncoder().encode(otp);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const { data, error } = await api.generateOTP(user.id, otpHash);
    
    if (error) return { success: false, message: error.message };
    
    if (data.success) {
      // In a real production environment, the RPC would trigger an email.
      // For this implementation, we log it for visibility (Requirement 4.4)
      console.log(`[SECURITY DISPATCH] OTP for ${data.email}: ${otp}`);
      return { success: true, email: data.email };
    } else {
      return { success: false, message: data.message, cooldown: data.cooldown_remaining };
    }
  }, [user]);

  const verifyOTP = useCallback(async (otp: string) => {
    if (!user) return { success: false, message: 'Session expired. Please log in again.' };

    // Azad Bypass (Requirement 1.2)
    if (profile?.username === 'Azad') {
      setIsOtpVerified(true);
      persistTrust(user.id, profile, true);
      return { success: true };
    }

    const { data, error } = await api.verifyOTP(user.id, otp);
    if (error) return { success: false, message: error.message };

    if (data.success) {
      setIsOtpVerified(true);
      sessionStorage.setItem('otp_verified', 'true');
      persistTrust(user.id, profile, true);
      return { success: true };
    } else {
      // Requirement 8: Failure Handling
      return { success: false, message: data.message, remainingAttempts: data.remaining_attempts };
    }
  }, [user, profile]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.signInWithSSO({
        domain: 'miaoda-gg.com',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_self');
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signUpWithUsername = useCallback(async (username: string, password: string) => {
    try {
      const email = `${username}@miaoda.com`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const verifyPIN = useCallback(async (pin: string) => {
    if (!user || !profile) return { success: false, message: 'Session expired. Please log in again.' };

    // Admins are exempt from PIN verification
    if (profile.role === 'admin') {
      setIsPinVerified(true);
      return { success: true };
    }

    const { data, error } = await api.verifyPIN(user.id, pin);
    if (error) return { success: false, message: error.message };

    if (data.success) {
      setIsPinVerified(true);
      // Persist the trusted state for this account/device so PIN is not asked again.
      await persistTrust(user.id, profile, isOtpVerified);
      return { success: true };
    } else {
      return { success: false, message: data.message };
    }
  }, [user, profile, isOtpVerified]);

  const updatePIN = useCallback(async (newPin: string) => {
    if (!user) return { error: new Error('Session expired') };
    const { error } = await api.updatePIN(user.id, newPin);
    if (!error) {
      // Re-fetch profile to update setup status
      await refreshProfile();
      // After update, it's also verified
      setIsPinVerified(true);
      // Persist the trusted state for this account/device.
      await persistTrust(user.id, profile, isOtpVerified);
    }
    return { error };
  }, [user, refreshProfile, profile, isOtpVerified]);

  const signOut = useCallback(async (redirectTo?: string) => {
    try {
      if (currentSessionId) {
        await (supabase.from('student_sessions') as any).update({ status: 'expired' }).eq('id', currentSessionId);
      }

      // Keep the saved account on the device so the student can select it from
      // the account picker after logout without re-entering their password or PIN.
      const role = profile?.role;

      // Clear all local state
      setUser(null);
      setProfile(null);
      setModuleSettings([]);
      setCurrentSessionId(null);
      setIsPinVerified(false);
      setIsOtpVerified(false);
      localStorage.removeItem('current_session_id');
      sessionStorage.removeItem('pin_verified');
      sessionStorage.removeItem('otp_verified');

      // Invalidate Supabase session
      await supabase.auth.signOut();

      // Force reload to ensure all listeners and caches are cleared
      let finalRedirect = redirectTo;
      if (!finalRedirect) {
        if (role === 'admin') finalRedirect = '/rsbs-admin-access';
        else if (role === 'teacher') finalRedirect = '/teacher-login';
        else if (role === 'parent') finalRedirect = '/parent/login';
        else if (role === 'student') finalRedirect = '/student-login';
        else finalRedirect = '/';
      }

      window.location.href = finalRedirect;
    } catch (error) {
      console.error('Error during sign out:', error);
      window.location.href = redirectTo || '/';
    }
  }, [currentSessionId, profile, user]);

  const trustDevice = useCallback(async (account: Omit<SavedAccount, 'savedAt'>) => {
    await addSavedAccount(account);
  }, []);

  const untrustDevice = useCallback(async (profileId?: string) => {
    const target = profileId || user?.id;
    if (!target) return;
    await removeSavedAccount(target);
  }, [user]);

  const switchAccount = useCallback(async (profileId: string) => {
    try {
      await switchSavedAccount(profileId);
      // onAuthStateChange will fire SIGNED_IN; wait for profile to load.
      setLoading(true);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message || 'Could not switch account' };
    }
  }, []);

  const contextValue = useMemo(() => ({
    user, profile, moduleSettings, loading, isRestoringSession, currentSessionId,
    isPinVerified, isOtpVerified, isPinRequired, isOtpRequired,
    signInWithUsername, signUpWithUsername, signInWithGoogle, signOut, refreshProfile,
    isModuleEnabled, verifyPIN, updatePIN, verifyOTP, sendOTP,
    shouldRequireOTP, checkAuthStatus,
    trustDevice, untrustDevice, switchAccount,
  }), [
    user, profile, moduleSettings, loading, isRestoringSession, currentSessionId,
    isPinVerified, isOtpVerified, isPinRequired, isOtpRequired,
    signInWithUsername, signUpWithUsername, signInWithGoogle, signOut, refreshProfile,
    isModuleEnabled, verifyPIN, updatePIN, verifyOTP, sendOTP,
    shouldRequireOTP, checkAuthStatus,
    trustDevice, untrustDevice, switchAccount,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
