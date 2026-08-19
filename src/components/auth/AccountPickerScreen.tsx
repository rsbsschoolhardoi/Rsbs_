/**
 * AccountPickerScreen
 * ────────────────────
 * Google / Microsoft-style compact account picker.
 *
 * Auth flow:
 *   Saved Account tap → onSelectAccount(account)
 *   The parent page checks the existing Supabase session:
 *     • Valid session for this user → AuthContext routes to PIN
 *     • Expired / no session → parent shows password re-entry form
 *   Password is NEVER asked here — this screen is selection-only.
 *
 * Displays per-account: profile photo → full name → verification ID.
 * NEVER shows login ID, username, or internal UUID.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { MoreVertical, UserPlus, Loader2, Trash2, ChevronLeft, Check } from 'lucide-react';
import type { SavedAccount, SavedAccountRole } from '@/hooks/useAccountPicker';

interface AccountPickerScreenProps {
  accounts: SavedAccount[];
  role: SavedAccountRole;
  gradientClass: string;
  brandIcon: React.ReactNode;
  brandTitle: string;
  idLabel: string;
  /** If provided, the matching saved account is marked as the active session. */
  currentProfileId?: string | null;
  /** Parent calls this when an account is tapped. Should attempt session restore then navigate to PIN. */
  onSelectAccount: (account: SavedAccount) => Promise<void>;
  onUseAnother: () => void;
  onRemoveAccount: (profileId: string) => void;
  /** When true, the whole list is disabled to prevent double-taps while auth state settles. */
  isProcessing?: boolean;
}

function getInitials(fullName?: string): string {
  if (!fullName) return '?';
  return fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export const AccountPickerScreen: React.FC<AccountPickerScreenProps> = ({
  accounts,
  role,
  gradientClass,
  brandIcon,
  brandTitle,
  idLabel,
  currentProfileId,
  onSelectAccount,
  onUseAnother,
  onRemoveAccount,
  isProcessing = false,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [removeMode, setRemoveMode] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<SavedAccount | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const handleSelect = async (acc: SavedAccount) => {
    if (removeMode) {
      setRemoveTarget(acc);
      setRemoveDialogOpen(true);
      return;
    }
    setLoadingId(acc.profileId);
    try {
      await onSelectAccount(acc);
    } finally {
      setLoadingId(null);
    }
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    onRemoveAccount(removeTarget.profileId);
    setRemoveTarget(null);
    setRemoveDialogOpen(false);
    setRemoveMode(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      {/* Decorative orbs */}
      <div className={cn('absolute -top-24 -left-24 w-64 h-64 rounded-full opacity-8 blur-3xl pointer-events-none', gradientClass)} />
      <div className={cn('absolute -bottom-24 -right-24 w-72 h-72 rounded-full opacity-6 blur-3xl pointer-events-none', gradientClass)} />

      {/* Three-dot / Cancel toggle — top-right */}
      <div className="absolute top-3 right-3 z-20">
        {!removeMode ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl w-52 p-1.5">
              <DropdownMenuItem
                className="rounded-xl px-3 py-2.5 cursor-pointer text-sm font-medium gap-2.5 text-destructive focus:text-destructive focus:bg-destructive/8"
                onClick={() => setRemoveMode(true)}
              >
                <Trash2 className="w-4 h-4" />
                Remove account from device
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={() => { setRemoveMode(false); setRemoveTarget(null); }}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1 rounded-full border border-border/60 hover:border-border bg-background/80 backdrop-blur-sm"
          >
            <ChevronLeft className="w-3 h-3" /> Cancel
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-xs flex flex-col items-center"
      >
        {/* Brand mark — compact */}
        <div className="flex flex-col items-center mb-5 gap-2">
          <div className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shadow-lg text-white [&>svg]:w-5 [&>svg]:h-5',
            gradientClass,
          )}>
            {brandIcon}
          </div>
          <div className="text-center">
            <p className="text-xs font-bold font-medium text-muted-foreground">RSBS School</p>
            <h1 className="text-base font-semibold tracking-tight text-foreground mt-0.5">{brandTitle}</h1>
          </div>
        </div>

        {/* Remove-mode banner */}
        <AnimatePresence>
          {removeMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full mb-3 overflow-hidden"
            >
              <div className="bg-destructive/8 border border-destructive/20 rounded-xl px-3 py-2 text-center">
                <p className="text-xs font-semibold text-destructive">Tap an account to remove it from this device</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Account list — individual premium rounded cards */}
        <div className="w-full flex flex-col gap-3">
          {accounts.map((acc, i) => {
            const isLoading = loadingId === acc.profileId;
            const initials = getInitials(acc.fullName);
            const isCurrent = currentProfileId === acc.profileId;
            return (
              <motion.button
                key={acc.profileId}
                layoutId={acc.profileId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                whileTap={removeMode ? {} : { scale: 0.985 }}
                onClick={() => handleSelect(acc)}
                disabled={!!loadingId || isProcessing}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all duration-200 disabled:opacity-60 min-h-[72px]',
                  'bg-card border shadow-sm',
                  isCurrent && !removeMode
                    ? 'border-primary/50 shadow-md shadow-primary/10 ring-1 ring-primary/20'
                    : 'border-border/60 hover:border-primary/30 hover:shadow-md',
                  removeMode
                    ? 'hover:border-destructive/40 hover:bg-destructive/[0.03] active:bg-destructive/[0.06]'
                    : 'active:scale-[0.99]',
                )}
              >
                {/* Avatar — 48×48 */}
                <div className="relative shrink-0">
                  <Avatar className={cn('h-12 w-12 border-2', isCurrent ? 'border-primary/50' : 'border-border/40')}>
                    <AvatarImage src={acc.avatarUrl || ''} className="object-cover" />
                    <AvatarFallback className={cn('font-bold text-sm', gradientClass, 'text-white')}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {isCurrent && !removeMode && (
                    <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 border-2 border-background">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                  {removeMode && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive flex items-center justify-center border-2 border-background">
                      <Trash2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Name + Login ID */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] leading-tight truncate text-foreground">
                    {acc.fullName}
                  </p>
                  <p className="text-[13px] text-muted-foreground truncate leading-tight mt-0.5">
                    {acc.loginId}
                  </p>
                </div>

                {/* Current / Loading */}
                {!removeMode && (
                  <div className="shrink-0 min-w-[4.5rem] text-right">
                    {isCurrent && !isLoading && (
                      <span className="text-[11px] font-semibold text-primary">Current</span>
                    )}
                    {isLoading && (
                      <span className="inline-flex items-center justify-center w-6 h-6">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </span>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Use another account */}
        {!removeMode && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            onClick={onUseAnother}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-dashed border-border/70 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/20 transition-all duration-150 text-sm font-medium mt-2.5"
          >
            <UserPlus className="w-4 h-4" />
            Use another account
          </motion.button>
        )}

        {/* Bottom hint */}
        {!removeMode && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xs text-muted-foreground text-center mt-4 px-2"
          >
            {idLabel}
          </motion.p>
        )}
      </motion.div>

      {/* Remove confirmation dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Remove Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              <strong className="text-foreground">{removeTarget?.fullName}</strong>
              {removeTarget?.loginId && (
                <> <span className="font-mono text-primary">{removeTarget.loginId}</span></>
              )}{' '}
              will be removed from this device only. The account itself is not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="rounded-xl flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
