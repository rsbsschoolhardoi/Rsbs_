import { Suspense, lazy } from 'react';
import MobileDashboard from '@/components/admin/dashboard/MobileDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

const DesktopDashboard = lazy(() => import('@/components/admin/dashboard/DesktopDashboard'));

function DesktopSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileDashboard />;
  }

  return (
    <Suspense fallback={<DesktopSkeleton />}>
      <DesktopDashboard />
    </Suspense>
  );
}
