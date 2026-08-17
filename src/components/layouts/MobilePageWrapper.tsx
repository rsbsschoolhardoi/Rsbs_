/**
 * MobilePageWrapper
 * ─────────────────────────────────────────────────────────────────────────────
 * Immutable single-screen canvas for mobile viewports.
 *
 * CONTRACT:
 *  • No horizontal scroll — ever.
 *  • Children receive a compact, app-native typography context.
 *  • Tables, wide grids, and overflow content are safely clipped/scrolled
 *    within their own sub-containers, not the page.
 *  • Used exclusively inside the mobile branch of PortalLayout and
 *    AdminMobileLayout. Never rendered on desktop.
 */
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useLocation } from 'react-router-dom';

interface MobilePageWrapperProps {
  children: ReactNode;
  /** Extra class names applied to the outer scroll container */
  className?: string;
  /** When true, removes vertical padding (e.g. full-bleed hero screens) */
  noPadding?: boolean;
}

export function MobilePageWrapper({ children, className, noPadding }: MobilePageWrapperProps) {
  const location = useLocation();

  return (
    /*
     * Outer wrapper: kills ALL horizontal overflow at this level.
     * Width is strictly bounded to the viewport — nothing can push it wider.
     * Use min-h-full so the page expands with content and never clips data.
     */
    <div
      className={cn(
        // Viewport lock
        'w-full max-w-full overflow-x-hidden',
        'min-h-full h-full touch-pan-y',
        // Mobile-native compact type scale applied as a CSS custom property
        // so descendant components can opt-in with `text-mobile-*` utilities
        'mobile-page-root',
        className
      )}
    >
      {/*
       * Inner content column: vertically scrollable, horizontally locked.
       * Compact spacing for native app feel. Children size naturally
       * (no forced flex-1) so data flows and scrollbars appear on the
       * outer container instead of being trapped.
       */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={cn(
          'w-full min-w-0 flex flex-col h-full min-h-0',
          !noPadding && 'px-3 py-3',
          // Compact global type scale for mobile pages (preserve page hierarchy)
          '[&_h1]:leading-tight',
          '[&_h2]:leading-tight',
          '[&_h3]:leading-snug',
          '[&_p]:text-sm [&_p]:leading-relaxed',
          // Prevent table overflow — force horizontal scroll on table containers
          '[&_table]:min-w-full',
          '[&_.table-container]:overflow-x-auto [&_.table-container]:-mx-3 [&_.table-container]:px-3',
          // Clamp large stat numbers inside cards
          '[&_.stat-value]:text-xl [&_.stat-value]:font-black',
          // Force all cards to be full-width on mobile, two columns on desktop
          '[&_.card-grid]:grid-cols-1 md:[&_.card-grid]:grid-cols-2',
          // Tighter card header rows
          '[&_[class*="flex items-center justify-between"]]:gap-2',
          '[&_[class*="card"]]:rounded-lg',
          // Compact form field spacing
          '[&_[class*="space-y-2"]]:space-y-1.5',
          '[&_.space-y-4]:space-y-3',
          '[&_.space-y-6]:space-y-4',
          '[&_.gap-4]:gap-3',
          '[&_.gap-6]:gap-4',
          '[&_.p-4]:p-3',
          '[&_.p-6]:p-3',
          '[&_.m-4]:m-3',
          '[&_.m-6]:m-3',
          // Keep touch-friendly buttons — do not shrink heights
          '[&_[class*="px-4"]]:px-3',
          '[&_[class*="py-2"]]:py-1.5',
          // Compact badges
          '[&_[class*="badge"]]:text-[10px] [&_[class*="badge"]]:px-1.5 [&_[class*="badge"]]:py-0',
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}
