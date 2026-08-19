import React from 'react';
import { useLocation, Outlet, Link, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  User, 
  CreditCard, 
  CheckCircle2, 
  MoreHorizontal,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ParentProvider, useParent } from '@/contexts/ParentContext';
import { motion, AnimatePresence } from "motion/react";

const NAV_ITEMS = [
  { label: 'Home', icon: LayoutDashboard, url: '/parent/dashboard' },
  { label: 'Profile', icon: User, url: '/parent/profile' },
  { label: 'Fees', icon: CreditCard, url: '/parent/fees' },
  { label: 'Attendance', icon: CheckCircle2, url: '/parent/attendance' },
  { label: 'More', icon: MoreHorizontal, url: '/parent/more' },
];

function ParentLayoutContent() {
  const location = useLocation();
  const { profile, loading: authLoading } = useAuth();
  const { loading: parentLoading, students } = useParent();

  if (authLoading || parentLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  if (!profile || profile.role !== 'parent') {
    return <Navigate to="/parent/login" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background pb-20 md:pb-24">
      {/* Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto md:max-w-4xl px-4 pt-6 md:pt-10 mb-8 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t z-50 px-2 pb-safe md:px-8">
        <div className="flex justify-around items-center h-16 md:h-20 max-w-4xl mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <Link
                key={item.url}
                to={item.url}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 relative",
                  isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-primary/70"
                )}
              >
                <item.icon className={cn("w-5 h-5 md:w-6 md:h-6", isActive && "stroke-[2.5px]")} />
                <span className="text-xs md:text-xs font-bold font-medium">{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="parent-bottom-nav-indicator"
                    className="absolute top-0 w-8 md:w-10 h-1 bg-primary rounded-full" 
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function ParentPortalLayout() {
  return (
    <ParentProvider>
      <ParentLayoutContent />
    </ParentProvider>
  );
}
