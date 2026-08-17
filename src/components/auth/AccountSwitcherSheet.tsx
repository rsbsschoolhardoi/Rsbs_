import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { SavedAccount } from '@/lib/trustedDeviceApi';

interface AccountSwitcherSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: SavedAccount[];
  currentProfileId: string;
  onSelectAccount: (account: SavedAccount) => void;
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-auto max-h-[80vh] rounded-t-3xl border-t border-border bg-background px-0 pb-8"
      >
        <SheetHeader className="px-6 pb-2 text-left">
          <SheetTitle className="text-lg font-black tracking-tight">Switch Account</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Long-press your avatar anytime to switch accounts instantly.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col">
          <AnimatePresence mode="popLayout">
            {accounts.map((account, index) => {
              const isCurrent = account.profileId === currentProfileId;
              const initials = account.fullName
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || '?';

              return (
                <motion.button
                  key={account.profileId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                  onClick={() => onSelectAccount(account)}
                  className="flex items-center gap-4 w-full px-6 py-4 text-left hover:bg-muted/50 transition-colors active:scale-[0.99]"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border border-border">
                      <AvatarImage src={account.avatarUrl || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {isCurrent && (
                      <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 border border-background">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{account.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Login ID: <span className="font-mono text-muted-foreground/70">{account.verificationId}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-xs font-semibold text-primary">
                    {isCurrent ? 'Current' : 'Tap to switch'}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>

          <div className="px-6 pt-4">
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
