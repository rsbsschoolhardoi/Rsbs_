import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface LogoutConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
}

export function LogoutConfirmation({ open, onOpenChange, redirectTo }: LogoutConfirmationProps) {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const role = profile?.role;
    
    // Determine where to redirect
    let targetPath = '/';
    if (redirectTo) {
      targetPath = redirectTo;
    } else if (role === 'admin') {
      targetPath = '/rsbs-admin-access';
    } else if (role === 'teacher') {
      targetPath = '/teacher-login';
    } else if (role === 'parent') {
      targetPath = '/parent/login';
    } else {
      targetPath = '/student-login';
    }
    
    // AuthContext's signOut already handles the reload and redirect
    await signOut(targetPath);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to logout? This will end your current session.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Logout
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
