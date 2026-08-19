import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityItem } from './types';
import { formatDistanceToNow } from 'date-fns';
import { UserPlus, CreditCard, CalendarCheck, Megaphone, FileText, GraduationCap, RefreshCw } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  student: UserPlus,
  fee: CreditCard,
  attendance: CalendarCheck,
  notice: Megaphone,
  certificate: FileText,
  admission: GraduationCap,
  default: RefreshCw,
};

interface RecentActivityProps {
  items: ActivityItem[];
}

export default function RecentActivity({ items }: RecentActivityProps) {
  return (
    <Card className="rounded-2xl border border-border/60 bg-card shadow-card flex flex-col">
      <CardHeader className="p-5 pb-3 border-b">
        <CardTitle className="text-sm font-semibold text-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-5 flex-1 overflow-y-auto max-h-[420px]">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No recent activity found.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const Icon = ICONS[item.type] || ICONS.default;
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      {item.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
