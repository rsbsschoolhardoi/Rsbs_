import { useLocation, Outlet, Navigate, Link } from 'react-router-dom';
import { Suspense } from 'react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { MobilePageWrapper } from "./MobilePageWrapper";
import { PageSkeleton } from "./PageSkeleton";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from '@/contexts/AuthContext';
import { useMediaQuery } from '@/hooks/use-mobile';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Bell, User, LogOut, Settings } from "lucide-react";
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { SaveLoginDialog } from '@/components/auth/SaveLoginDialog';
import { AccountSwitcherSheet } from '@/components/auth/AccountSwitcherSheet';
import type { SavedAccountRole } from '@/lib/trustedDeviceApi';
import { useAccountPicker } from '@/hooks/useAccountPicker';
import { useLongPress } from '@/hooks/useLongPress';
import type { SavedAccount } from '@/lib/trustedDeviceApi';

interface PortalLayoutProps {
  role: 'student' | 'teacher' | 'parent' | 'admin';
  title: string;
}

import { ROUTES } from '@/constants/routes';

export function PortalLayout({ role, title }: PortalLayoutProps) {
  const location = useLocation();
  const { profile, loading, signOut, switchAccount, trustDevice, untrustDevice } = useAuth();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isStudyAI = location.pathname === ROUTES.STUDENT.STUDY_AI;
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Account picker is only relevant for non-admin roles
  const pickerRole = (role !== 'admin' ? role : null) as SavedAccountRole | null;
  const { accounts: savedAccounts, saveAccount } = useAccountPicker(pickerRole ?? undefined);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  if (!profile || String(profile.role) !== String(role)) {
    const loginPath = role === 'admin'   ? ROUTES.AUTH.ADMIN_LOGIN   :
                      role === 'teacher' ? ROUTES.AUTH.TEACHER_LOGIN :
                      role === 'parent'  ? ROUTES.AUTH.PARENT_LOGIN  : ROUTES.AUTH.STUDENT_LOGIN;
    return <Navigate to={loginPath} replace />;
  }

  const userInitial = profile.username ? profile.username[0].toUpperCase() : 'U';

  const getRoleRoutes = () => {
    switch (role) {
      case 'student': return ROUTES.STUDENT;
      case 'teacher': return ROUTES.TEACHER;
      case 'parent':  return ROUTES.PARENT;
      default:        return ROUTES.STUDENT;
    }
  };
  const roleRoutes = getRoleRoutes();

  // Intercept logout — show Save/Exit dialog for non-admin roles
  const handleLogoutRequest = () => {
    if (role === 'admin') {
      signOut();
    } else {
      setSaveDialogOpen(true);
    }
  };

  /** Save & Exit: keep the trusted account on the device and end the session. */
  const handleSaveAndExit = async () => {
    setSaveDialogOpen(false);
    const loginPath = role === 'teacher' ? ROUTES.AUTH.TEACHER_LOGIN :
                      role === 'parent' ? ROUTES.AUTH.PARENT_LOGIN :
                      ROUTES.AUTH.STUDENT_LOGIN;

    // Ensure the current account is recorded as trusted so the student can
    // return directly from the account picker without re-entering credentials.
    if (profile && !savedAccounts.some(a => a.profileId === profile.id)) {
      try {
        await saveAccount({
          profileId: profile.id,
          username: profile.login_id || profile.username || '',
          fullName: profile.student_name || profile.teacher_name || profile.parent_name || profile.username || '',
          loginId: profile.login_id || profile.username || '',
          verificationId: profile.verification_id || profile.username || '',
          role: role as SavedAccountRole,
          avatarUrl: profile.avatar_url || undefined,
          pinVerified: true,
          otpVerified: true,
        });
      } catch (err) {
        console.warn('Failed to save account on exit:', err);
      }
    }

    await signOut(loginPath);
  };

  /** Logout: revoke the trusted session for this account and end the session. */
  const handleLogout = async () => {
    setSaveDialogOpen(false);
    if (profile?.id) {
      try {
        await untrustDevice(profile.id);
      } catch (err) {
        console.warn('Failed to revoke trusted account on logout:', err);
      }
    }
    await signOut();
  };

  const longPress = useLongPress({
    threshold: 600,
    onLongPress: (e) => {
      if (role === 'admin') return;
      e.preventDefault();
      setSwitcherOpen(true);
    },
  });

  const handleSelectSwitcherAccount = async (account: SavedAccount) => {
    setSwitcherOpen(false);
    if (account.profileId === profile?.id) return;
    if (account.pinVerified) {
      try {
        await switchAccount(account.profileId);
        toast.success('Switched account');
      } catch (err: any) {
        toast.error(err.message || 'Could not switch account');
      }
    } else {
      await signOut();
    }
  };

  const handleAddAccount = () => {
    setSwitcherOpen(false);
    const loginPath = role === 'teacher' ? ROUTES.AUTH.TEACHER_LOGIN :
                      role === 'parent' ? ROUTES.AUTH.PARENT_LOGIN :
                      ROUTES.AUTH.STUDENT_LOGIN;
    signOut(loginPath);
  };

  // ── Shared animated page content (desktop only) ──────────────────────────
  const desktopPageContent = isStudyAI ? (
    <div className="h-full w-full">
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </div>
  ) : (
    <AnimatePresence>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="mx-auto w-full max-w-7xl p-4 md:p-10 pt-6 md:pt-10"
      >
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );

  // ── MOBILE: full-screen app shell ─────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div className="flex flex-col h-dvh w-full overflow-hidden bg-background">
          {/* Mobile top bar — hidden for Study AI to give it a full-screen chat app feel */}
          {!isStudyAI && (
            <motion.header
              initial={{ y: -56, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28, delay: 0.05 }}
              className="flex h-12 shrink-0 items-center justify-between px-3 border-b bg-background/90 backdrop-blur-md sticky top-0 z-40"
            >
              {/* Brand mark */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shadow-sm shadow-primary/30">
                  <span className="text-primary-foreground font-black text-[10px] tracking-tight">RS</span>
                </div>
                <span className="font-black text-[10px] uppercase tracking-[0.18em] text-primary">{title}</span>
              </div>

              {/* Bell + Avatar */}
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon" className="rounded-full relative h-8 w-8" onClick={() => {}}>
                  <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full border border-background" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-full" {...longPress}>
                      <Avatar className="h-7 w-7 border border-muted">
                        <AvatarImage src={profile.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary font-black text-[10px]">{userInitial}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl p-2 mt-2">
                    <DropdownMenuLabel className="p-2.5">
                      <p className="text-sm font-black truncate uppercase tracking-widest">{profile.username}</p>
                      <p className="text-[10px] text-muted-foreground truncate font-bold uppercase mt-0.5 tracking-wider">{role} ACCOUNT</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {role !== 'admin' && (
                      <DropdownMenuItem
                        onClick={() => setSwitcherOpen(true)}
                        className="rounded-lg p-2.5 cursor-pointer focus:bg-muted"
                      >
                        <User className="w-4 h-4 mr-2" />
                        <span className="font-black text-xs uppercase tracking-widest">Switch account</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={handleLogoutRequest}
                      className="rounded-lg p-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/5"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      <span className="font-black text-xs uppercase tracking-widest">Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.header>
          )}

          {/* Scrollable content */}
          <main className={cn(
            "flex-1 min-h-0 bg-background overscroll-y-contain no-scrollbar",
            isStudyAI ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden",
            !isStudyAI && "pb-safe-bottom"
          )}>
            <div className="min-h-full">
              <MobilePageWrapper noPadding={isStudyAI}>
                <Suspense fallback={<PageSkeleton />}>
                  <Outlet />
                </Suspense>
              </MobilePageWrapper>
            </div>
          </main>

          {!isStudyAI && <BottomNav role={role} />}
        </div>

        {/* Exit session dialog */}
        <SaveLoginDialog
          open={saveDialogOpen}
          displayName={profile.student_name || profile.teacher_name || profile.parent_name || profile.username}
          loginId={profile.login_id || profile.username || ''}
          onSaveAndExit={handleSaveAndExit}
          onLogout={handleLogout}
          onCancel={() => setSaveDialogOpen(false)}
        />
        <AccountSwitcherSheet
          open={switcherOpen}
          onOpenChange={setSwitcherOpen}
          accounts={savedAccounts}
          currentProfileId={profile.id}
          onSelectAccount={handleSelectSwitcherAccount}
          onAddAccount={handleAddAccount}
        />
      </>
    );
  }

  // ── DESKTOP (≥768px) ─────────────────────────────────────────────────────
  return (
    <>
      <SidebarProvider>
        <AppSidebar role={role === 'admin' ? 'admin' : role === 'teacher' ? 'teacher' : 'student'} />

        <SidebarInset className="pb-0 flex flex-col h-screen overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear border-b bg-background/80 backdrop-blur-md sticky top-0 z-40 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/${role}`}>{title}</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {location.pathname.split('/').pop()?.charAt(0).toUpperCase()}
                      {location.pathname.split('/').pop()?.slice(1) || 'Dashboard'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => {}} className="rounded-full relative hover:bg-muted active:scale-95 transition-all">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="p-1 h-auto rounded-full hover:bg-muted active:scale-95 transition-all border border-muted" {...longPress}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">{userInitial}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 mt-2">
                  <DropdownMenuLabel className="p-3">
                    <p className="text-sm font-black truncate uppercase tracking-widest">{profile.username}</p>
                    <p className="text-[10px] text-muted-foreground truncate font-bold uppercase mt-0.5 tracking-wider">{role} ACCOUNT</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="rounded-xl p-3 cursor-pointer">
                    <Link to={(roleRoutes as any).PROFILE || `/${role}`} className="flex items-center gap-3">
                      <User className="w-4 h-4" />
                      <span className="font-bold text-xs uppercase">Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl p-3 cursor-pointer">
                    <Link to={(roleRoutes as any).SETTINGS || `/${role}`} className="flex items-center gap-3">
                      <Settings className="w-4 h-4" />
                      <span className="font-bold text-xs uppercase">Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {role !== 'admin' && (
                    <DropdownMenuItem
                      onClick={() => setSwitcherOpen(true)}
                      className="rounded-xl p-3 cursor-pointer"
                    >
                      <User className="w-4 h-4 mr-3" />
                      <span className="font-black text-xs uppercase tracking-widest">Switch account</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={handleLogoutRequest}
                    className="rounded-xl p-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/5"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    <span className="font-black text-xs uppercase tracking-widest">Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className={cn(
            "flex-1 no-scrollbar bg-slate-50/50 dark:bg-background/50 scroll-smooth",
            isStudyAI ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden"
          )}>
            {desktopPageContent}
          </main>
        </SidebarInset>
      </SidebarProvider>

      {/* Exit session dialog */}
      <SaveLoginDialog
        open={saveDialogOpen}
        displayName={(profile as any)?.student_name || (profile as any)?.teacher_name || (profile as any)?.parent_name || profile.username}
        loginId={profile.login_id || profile.username || ''}
        onSaveAndExit={handleSaveAndExit}
        onLogout={handleLogout}
        onCancel={() => setSaveDialogOpen(false)}
      />
      <AccountSwitcherSheet
        open={switcherOpen}
        onOpenChange={setSwitcherOpen}
        accounts={savedAccounts}
        currentProfileId={profile.id}
        onSelectAccount={handleSelectSwitcherAccount}
        onAddAccount={handleAddAccount}
      />
    </>
  );
}
