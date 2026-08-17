import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckCircle2, CreditCard, Megaphone, User, Clock, Search, CalendarCheck, UserPlus, Sparkles, BookOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';

import { ROUTES } from '@/constants/routes';

export function BottomNav({ role }: { role: 'admin' | 'student' | 'teacher' | 'parent' }) {
  const location = useLocation();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const { isModuleEnabled } = useAuth();

  useEffect(() => {
    setPendingUrl(null);
  }, [location.pathname]);

  // Admin bottom nav is handled inside AdminMobileLayout — never render here for admin
  if (role === 'admin') return null;

  const studentItems = [
    { label: 'Home',       icon: LayoutDashboard, url: ROUTES.STUDENT.DASHBOARD,  id: 'dashboard' },
    { label: 'Attendance', icon: CheckCircle2,     url: ROUTES.STUDENT.ATTENDANCE, id: 'attendance' },
    { label: 'Study AI',   icon: Sparkles,         url: ROUTES.STUDENT.STUDY_AI,   id: 'study-ai' },
    { label: 'Quizzes',    icon: BookOpen,         url: ROUTES.STUDENT.QUIZ,       id: 'quizzes' },
    { label: 'Fees',       icon: CreditCard,       url: ROUTES.STUDENT.FEES,       id: 'fees' },
    { label: 'Menu',       icon: User,             url: ROUTES.STUDENT.MORE,       id: 'more' },
  ];

  const teacherItems = [
    { label: 'Dashboard',  icon: LayoutDashboard, url: ROUTES.TEACHER.DASHBOARD,  id: 'dashboard' },
    { label: 'Attendance', icon: CheckCircle2,    url: ROUTES.TEACHER.ATTENDANCE, id: 'attendance' },
    { label: 'Timetable',  icon: Clock,           url: ROUTES.TEACHER.TIMETABLE,  id: 'timetable' },
    { label: 'Profile',    icon: User,            url: ROUTES.TEACHER.PROFILE,    id: 'profile' },
  ];

  const parentItems = [
    { label: 'Home',       icon: LayoutDashboard, url: ROUTES.PARENT.DASHBOARD,   id: 'dashboard' },
    { label: 'Attendance', icon: CheckCircle2,    url: ROUTES.PARENT.ATTENDANCE,  id: 'attendance' },
    { label: 'Fees',       icon: CreditCard,      url: ROUTES.PARENT.FEES,        id: 'fees' },
    { label: 'Profile',    icon: User,            url: ROUTES.PARENT.PROFILE,     id: 'profile' },
  ];

  const allItems = role === 'student' ? studentItems : role === 'teacher' ? teacherItems : parentItems;
  const items = allItems.filter(i => {
    if (['profile', 'dashboard', 'search', 'study-ai', 'more'].includes(i.id)) return true;
    return isModuleEnabled(i.id);
  });

  return (
    // Floating glass pill bottom nav — native app feel
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm md:hidden z-50 rounded-2xl border border-white/20 dark:border-white/10 bg-background/60 backdrop-blur-xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)] h-14 px-1.5 flex items-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((item) => {
        const isActive = location.pathname === item.url;
        const isLoading = pendingUrl === item.url;
        return (
          <Link
            key={item.url}
            to={item.url}
            onClick={() => setPendingUrl(item.url)}
            className={cn(
              'flex items-center justify-center flex-1 h-full relative select-none rounded-xl transition-colors duration-200',
              isActive ? 'text-primary' : 'text-muted-foreground/70'
            )}
            aria-label={item.label}
            title={item.label}
          >
            <motion.div
              whileTap={{ scale: 0.78 }}
              transition={{ type: 'spring', stiffness: 520, damping: 22 }}
              className="relative flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-[22px] h-[22px] animate-spin stroke-[2.5px] text-primary" />
              ) : (
                <item.icon
                  className={cn(
                    'w-[22px] h-[22px] transition-all duration-200',
                    isActive ? 'stroke-[2.5px] nav-glow' : 'stroke-[1.8px]'
                  )}
                />
              )}
              {/* Active glow dot */}
              {isActive && !isLoading && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary nav-glow-dot" />
              )}
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
