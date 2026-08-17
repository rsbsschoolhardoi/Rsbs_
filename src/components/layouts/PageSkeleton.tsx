import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'motion/react';

/**
 * Lightweight premium skeleton shown while a lazy route is loading.
 * Designed to match the Student Panel app shell: header, content cards, bottom.
 */
export function PageSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full min-h-full flex flex-col"
      aria-busy="true"
      aria-label="Loading page"
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-4 py-4 md:py-6 border-b border-border/50">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border/50 bg-card/50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-3/4 rounded-md" />
                <Skeleton className="h-2.5 w-1/2 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-3/4 rounded-md" />
                <Skeleton className="h-2.5 w-1/2 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
