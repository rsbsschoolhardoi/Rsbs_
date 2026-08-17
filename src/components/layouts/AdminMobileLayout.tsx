/**
 * AdminMobileLayout
 * ─────────────────────────────────────────────────────────
 * Rendered ONLY on mobile viewports (< 768 px).
 * Desktop (≥ 768 px) stays on the full AdminLayout with sidebar.
 *
 * 5 emergency bottom tabs:
 *  1. Attendance Desk   — quick daily log toggle
 *  2. Fees Ledger       — rapid manual payment entry
 *  3. Notice Dispatch   — emergency alert composer
 *  4. Query Desk        — review admissions/appointment queries
 *  5. Menu Hub          — slide-out panel with profile + nav
 */
import { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarCheck, CreditCard, Megaphone, MessageSquare, Menu, X, LogOut, User, LayoutDashboard, Settings, ChevronRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/constants/routes';
import AdminMobileDashboard from '@/pages/admin/AdminMobileDashboard';
import { MobilePageWrapper } from '@/components/layouts/MobilePageWrapper';

// ── Admin emergency bottom tabs ──────────────────────────────────────────────
const ADMIN_MOBILE_TABS = [
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck, url: ROUTES.ADMIN.ATTENDANCE },
  { id: 'fees',       label: 'Fees',       icon: CreditCard,    url: ROUTES.ADMIN.FEES },
  { id: 'notices',    label: 'Notices',    icon: Megaphone,     url: ROUTES.ADMIN.NOTICES },
  { id: 'queries',    label: 'Queries',    icon: MessageSquare, url: ROUTES.ADMIN.QUERIES },
  { id: 'menu',       label: 'Menu',       icon: Menu,          url: '__menu__' },
];

// Quick-access links shown inside the Menu Hub drawer
const HUB_LINKS = [
  { label: 'Dashboard',    url: ROUTES.ADMIN.DASHBOARD,        icon: LayoutDashboard },
  { label: 'Students',     url: ROUTES.ADMIN.STUDENTS,         icon: User },
  { label: 'Admissions',   url: ROUTES.ADMIN.ADMISSIONS,       icon: User },
  { label: 'Quizzes',      url: ROUTES.ADMIN.QUIZ,             icon: BookOpen },
  { label: 'Appointments', url: ROUTES.ADMIN.APPOINTMENTS,     icon: CalendarCheck },
  { label: 'Branding',     url: ROUTES.ADMIN.BRANDING,         icon: Settings },
];

export default function AdminMobileLayout() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Auth guard
  if (!profile || profile.role !== 'admin') {
    return <Navigate to={ROUTES.AUTH.ADMIN_LOGIN} replace />;
  }

  const userInitial = profile.username ? profile.username[0].toUpperCase() : 'A';

  const handleTabPress = (tab: typeof ADMIN_MOBILE_TABS[number]) => {
    if (tab.url === '__menu__') {
      setMenuOpen(prev => !prev);
    } else {
      setMenuOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden bg-background">

      {/* ── Mobile Top Bar ─────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center justify-between px-3 border-b bg-background/90 backdrop-blur-md z-40 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shadow-sm shadow-primary/30">
            <span className="text-primary-foreground font-black text-[10px] tracking-tight">RS</span>
          </div>
          <span className="font-black text-[10px] uppercase tracking-[0.18em] text-primary">Admin</span>
        </div>
        <Avatar className="h-7 w-7 border border-muted">
          <AvatarImage src={profile.avatar_url || ''} />
          <AvatarFallback className="bg-primary/10 text-primary font-black text-[10px]">{userInitial}</AvatarFallback>
        </Avatar>
      </header>

      {/* ── Page Content ─────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pb-safe-bottom bg-background">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="min-h-full"
          >
            {/* Admin dashboard: render the mobile-native tile grid, not the desktop page */}
            {location.pathname === ROUTES.ADMIN.DASHBOARD || location.pathname === '/admin' ? (
              <MobilePageWrapper>
                <AdminMobileDashboard />
              </MobilePageWrapper>
            ) : (
              <MobilePageWrapper>
                <Outlet />
              </MobilePageWrapper>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Menu Hub Drawer ───────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-background border-t shadow-2xl"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-8 h-1 rounded-full bg-muted-foreground/25" />
              </div>

              {/* Profile header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={profile.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">{userInitial}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm uppercase tracking-widest truncate">{profile.username}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge className="h-4 text-[8px] bg-primary/10 text-primary border-none font-black uppercase px-1.5">
                      {profile.is_master ? 'Master Admin' : 'Administrator'}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full shrink-0 h-8 w-8" onClick={() => setMenuOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick links */}
              <div className="px-3 py-2 space-y-0.5">
                {HUB_LINKS.map(link => (
                  <Link
                    key={link.url}
                    to={link.url}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-muted/60 active:scale-[0.98] transition-all"
                  >
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <link.icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="font-semibold text-sm flex-1">{link.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>

              {/* Logout */}
              <div className="px-3 pb-5 pt-2 border-t mt-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/5 rounded-lg px-2.5 py-2.5 h-auto font-black text-xs uppercase tracking-widest"
                  onClick={() => { setMenuOpen(false); signOut(); }}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Sticky Bottom Navigation ──────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-t safe-area-inset-bottom">
        <div className="flex justify-around items-center h-14 px-1">
          {ADMIN_MOBILE_TABS.map(tab => {
            const isActive = tab.url !== '__menu__'
              ? location.pathname.startsWith(tab.url)
              : menuOpen;

            const content = (
              <div
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-all duration-200 select-none',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {/* Active pill indicator */}
                {isActive && (
                  <motion.div
                    layoutId="admin-mobile-indicator"
                    className="absolute top-0 inset-x-4 h-[2px] bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.82 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                >
                  <tab.icon className={cn('w-[18px] h-[18px]', isActive && 'stroke-[2.5px]')} />
                </motion.div>
                <span className="text-[9px] font-bold uppercase tracking-wider leading-none">{tab.label}</span>
              </div>
            );

            return tab.url === '__menu__' ? (
              <button
                key={tab.id}
                onClick={() => handleTabPress(tab)}
                className="flex-1 h-full flex items-center justify-center"
              >
                {content}
              </button>
            ) : (
              <Link
                key={tab.id}
                to={tab.url}
                onClick={() => handleTabPress(tab)}
                className="flex-1 h-full flex items-center justify-center"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
