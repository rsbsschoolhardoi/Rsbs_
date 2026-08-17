/**
 * AdminMobileDashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Single-screen emergency command centre rendered ONLY on mobile (<768px).
 *
 * Layout (top → bottom, fits in 100dvh):
 *  ┌──────────────────────────────────────┐
 *  │ Greeting + date strip                │  ~64px
 *  ├──────────────────────────────────────┤
 *  │ 4-stat live counter row              │  ~76px
 *  ├──────────────────────────────────────┤
 *  │ Emergency tile grid (2×2 + 1 wide)   │  flex-1
 *  ├──────────────────────────────────────┤
 *  │ Recent notices micro-list            │  ~120px
 *  └──────────────────────────────────────┘  (bottom nav = 64px, handled by parent)
 *
 * No horizontal scroll. No page scroll. Everything fits within h-dvh.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  CalendarCheck, CreditCard, Megaphone, MessageSquare,
  UserPlus, Users, ChevronRight, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Student, Notice, Admission, Appointment } from '@/types';
import { ROUTES } from '@/constants/routes';

// ── Tile definitions ──────────────────────────────────────────────────────────
const TILES = [
  {
    id: 'attendance',
    label: 'Attendance Desk',
    sublabel: 'Mark today\'s roll',
    icon: CalendarCheck,
    url: ROUTES.ADMIN.ATTENDANCE,
    gradient: 'from-violet-500 to-indigo-500',
    shadow: 'shadow-violet-200 dark:shadow-violet-900/40',
  },
  {
    id: 'fees',
    label: 'Fees Ledger',
    sublabel: 'Record payments',
    icon: CreditCard,
    url: ROUTES.ADMIN.FEES,
    gradient: 'from-emerald-500 to-teal-500',
    shadow: 'shadow-emerald-200 dark:shadow-emerald-900/40',
  },
  {
    id: 'notices',
    label: 'Notice Dispatch',
    sublabel: 'Broadcast alerts',
    icon: Megaphone,
    url: ROUTES.ADMIN.NOTICES,
    gradient: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-200 dark:shadow-amber-900/40',
  },
  {
    id: 'queries',
    label: 'Query Desk',
    sublabel: 'Review requests',
    icon: MessageSquare,
    url: ROUTES.ADMIN.QUERIES,
    gradient: 'from-sky-500 to-blue-500',
    shadow: 'shadow-sky-200 dark:shadow-sky-900/40',
  },
  {
    id: 'admissions',
    label: 'New Admissions',
    sublabel: 'Pending applications',
    icon: UserPlus,
    url: ROUTES.ADMIN.ADMISSIONS,
    gradient: 'from-rose-500 to-pink-500',
    shadow: 'shadow-rose-200 dark:shadow-rose-900/40',
    wide: true,
  },
];

// ── Stat counter ──────────────────────────────────────────────────────────────
interface StatBadgeProps {
  label: string;
  value: number | null;
  icon: React.ElementType;
  accent: string;
}

function StatBadge({ label, value, icon: Icon, accent }: StatBadgeProps) {
  return (
    <div className={cn('flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl bg-background border min-w-0 flex-1', 'shadow-sm')}>
      <Icon className={cn('w-4 h-4 shrink-0', accent)} />
      <span className="font-black text-base leading-none tabular-nums">
        {value === null ? '–' : value}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Emergency tile ────────────────────────────────────────────────────────────
interface TileProps {
  tile: typeof TILES[number];
  badge?: number;
  delay: number;
}

function EmergencyTile({ tile, badge, delay }: TileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28, delay }}
      className={cn(tile.wide ? 'col-span-2' : 'col-span-1')}
    >
      <Link
        to={tile.url}
        className={cn(
          'relative flex items-center gap-3 rounded-xl overflow-hidden p-3',
          'bg-gradient-to-br', tile.gradient,
          'shadow-lg', tile.shadow,
          'active:scale-[0.96] transition-transform duration-150',
          tile.wide ? 'h-14' : 'h-20 flex-col justify-between items-start',
        )}
      >
        {/* Icon */}
        <div className={cn(
          'rounded-xl bg-white/20 flex items-center justify-center shrink-0',
          tile.wide ? 'w-8 h-8' : 'w-10 h-10',
        )}>
          <tile.icon className={cn('text-white', tile.wide ? 'w-4 h-4' : 'w-5 h-5')} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-xs leading-tight truncate">{tile.label}</p>
          {!tile.wide && (
            <p className="text-white/70 text-[9px] font-medium mt-0.5 truncate">{tile.sublabel}</p>
          )}
        </div>

        {/* Badge */}
        {badge !== undefined && badge > 0 && (
          <div className="absolute top-2 right-2 min-w-[16px] h-[16px] rounded-full bg-white flex items-center justify-center px-1">
            <span className="text-[8px] font-black text-foreground">{badge > 99 ? '99+' : badge}</span>
          </div>
        )}

        {/* Arrow (wide tile only) */}
        {tile.wide && (
          <ChevronRight className="w-4 h-4 text-white/70 shrink-0" />
        )}

        {/* Decorative shimmer orb */}
        <div className="absolute -top-4 -right-4 w-14 h-14 rounded-full bg-white/10 pointer-events-none" />
      </Link>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminMobileDashboard() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getStudents(),
      api.getNotices(),
      api.getAdmissions(),
      api.getAppointments(),
    ]).then(([s, n, a, ap]) => {
      setStudents(s.data || []);
      setNotices(n.data || []);
      setAdmissions(a.data || []);
      setAppointments(ap.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const activeStudents = students.filter(s => s.status === 'active');
  const pendingFees = activeStudents.filter(s => s.fee_status !== 'Paid').length;
  const pendingAdmissions = admissions.filter(a => a.status === 'pending').length;
  const pendingAppointments = appointments.filter(a => a.status === 'pending').length;

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const tileBadges: Record<string, number> = {
    fees: pendingFees,
    admissions: pendingAdmissions,
    queries: pendingAppointments,
  };

  return (
    /*
     * Strict viewport canvas: flex column, no overflow, fills available space
     * between top bar and bottom nav (both handled by AdminMobileLayout).
     */
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">

      {/* ── Greeting strip ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="px-1 shrink-0"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{dateStr}</p>
        <h1 className="text-base font-black leading-tight">
          {greeting},{' '}
          <span className="text-primary">{profile?.username?.split(' ')[0] ?? 'Admin'}</span>
        </h1>
      </motion.div>

      {/* ── Live stat counters ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
        className="flex gap-2 shrink-0 px-0"
      >
        <StatBadge label="Students" value={loading ? null : activeStudents.length} icon={Users}        accent="text-indigo-500" />
        <StatBadge label="Fees Due"  value={loading ? null : pendingFees}           icon={CreditCard}  accent="text-amber-500" />
        <StatBadge label="Pending"   value={loading ? null : pendingAdmissions}     icon={UserPlus}    accent="text-rose-500" />
        <StatBadge label="Queries"   value={loading ? null : pendingAppointments}   icon={MessageSquare} accent="text-sky-500" />
      </motion.div>

      {/* ── Emergency tile grid ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        {TILES.map((tile, i) => (
          <EmergencyTile
            key={tile.id}
            tile={tile}
            badge={tileBadges[tile.id]}
            delay={0.05 * (i + 2)}
          />
        ))}
      </div>

      {/* ── Recent notices micro-list ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30, delay: 0.3 }}
        className="flex-1 min-h-0 flex flex-col"
      >
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-foreground">Recent Notices</span>
          </div>
          <Link to={ROUTES.ADMIN.NOTICES} className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-0.5">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-0.5">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
            ))
          ) : notices.length === 0 ? (
            <div className="flex items-center justify-center h-16 rounded-2xl border border-dashed">
              <p className="text-xs text-muted-foreground font-medium">No notices posted yet</p>
            </div>
          ) : (
            notices.slice(0, 4).map((notice: Notice) => (
              <Link
                key={(notice as any).id}
                to={ROUTES.ADMIN.NOTICES}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-background border hover:bg-muted/50 active:scale-[0.98] transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Megaphone className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{(notice as any).title}</p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {(notice as any).created_at
                      ? new Date((notice as any).created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      : 'Recent'}
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </Link>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
