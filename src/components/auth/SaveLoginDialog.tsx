/**
 * SaveLoginDialog
 * ────────────────
 * Shown when the user triggers logout from within a portal.
 * Lets them save account identity to localStorage (no sensitive data).
 * Displays full name + login ID — NEVER the verification ID or password.
 */
import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Save, LogOut, X } from 'lucide-react';

interface SaveLoginDialogProps {
  open: boolean;
  displayName: string;
  loginId: string;
  onSaveAndExit: () => void;
  onLogout: () => void;
  onCancel: () => void;
}

export const SaveLoginDialog: React.FC<SaveLoginDialogProps> = ({
  open,
  displayName,
  loginId,
  onSaveAndExit,
  onLogout,
  onCancel,
}) => (
  <AlertDialog open={open} onOpenChange={v => { if (!v) onCancel(); }}>
    <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm rounded-2xl p-6">
      <AlertDialogHeader className="text-left gap-1.5">
        <AlertDialogTitle className="text-lg font-semibold tracking-tight">
          Exit session?
        </AlertDialogTitle>
        <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">{displayName}</span>
          {loginId && (
            <> <span className="font-mono text-primary">{loginId}</span></>
          )}
          <br />
          <span className="text-[11px] mt-1 block text-muted-foreground/80">
            Your password and PIN are never saved.
          </span>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter className="flex flex-col gap-2 mt-2 sm:flex-col">
        <Button
          onClick={onSaveAndExit}
          className="w-full h-11 rounded-xl font-bold gap-2"
        >
          <Save className="w-4 h-4" />
          Save &amp; Exit
        </Button>
        <Button
          variant="ghost"
          onClick={onLogout}
          className="w-full h-11 rounded-xl font-semibold text-muted-foreground hover:text-foreground gap-2"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full h-11 rounded-xl font-medium text-muted-foreground gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
