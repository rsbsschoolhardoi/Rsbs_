import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import type { SavedAccount } from '@/lib/trustedDeviceApi';

interface AccountSwitcherSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: SavedAccount[];
  currentProfileId: string;
  onSelectAccount: (account: SavedAccount) => Promise<void> | void;
  onAddAccount: () => void;
}

export const AccountSwitcherSheet: React.FC<AccountSwitcherSheetProps> = ({
  open,
  onOpenChange,
  accounts,
  currentProfileId,
  onSelectAccount,
  onAddAccount,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSelect = async (account: SavedAccount) => {
    if (account.profileId === currentProfileId || loadingId) return;
    setLoadingId(account.profileId);
    try {
      await onSelectAccount(account);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-auto max-h-[80vh] rounded-t-3xl border-t border-border bg-background px-4 pb-8"
      >
        <SheetHeader className="pb-2 text-left">
          <SheetTitle className="text-lg font-black tracking-tight">Switch Account</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Long-press your avatar anytime to switch accounts instantly.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {accounts.map((account, index) => {
              const isCurrent = account.profileId === currentProfileId;
              const isLoading = loadingId === account.profileId;
              const initials = account.fullName
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || '?';

              return (
                <motion.button
                  key={account.profileId}
                  layoutId={account.profileId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => handleSelect(account)}
                  disabled={!!loadingId}
                  className={cn(
                    'flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl text-left transition-all duration-200 min-h-[72px]',
                    'bg-card border shadow-sm',
                    isCurrent
                      ? 'border-primary/50 shadow-md shadow-primary/10 ring-1 ring-primary/20'
                      : 'border-border/60 hover:border-primary/30 hover:shadow-md active:scale-[0.99]',
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className={cn('h-12 w-12 border-2', isCurrent ? 'border-primary/50' : 'border-border/40')}>
                      <AvatarImage src={account.avatarUrl || ''} className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {isCurrent && (
                      <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 border-2 border-background">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-foreground truncate leading-tight">{account.fullName}</p>
                    <p className="text-[13px] text-muted-foreground truncate leading-tight mt-0.5">
                      {account.loginId}
                    </p>
                  </div>
                  <div className="shrink-0 min-w-[4.5rem] text-right">
                    {isCurrent && !isLoading && (
                      <span className="text-[11px] font-semibold text-primary">Current</span>
                    )}
                    {isLoading && (
                      <span className="inline-flex items-center justify-center w-6 h-6">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </span>
                    )}
                    {!isCurrent && !isLoading && (
                      <span className="text-[11px] font-semibold text-muted-foreground">Tap to switch</span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>

          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl font-semibold gap-2"
              onClick={onAddAccount}
            >
              <Plus className="w-4 h-4" />
              Add another account
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
