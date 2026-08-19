import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({ title, value, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <Card className="rounded-2xl border border-border/60 bg-card shadow-card transition-all hover:shadow-hover">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-5">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="bg-muted text-accent p-2 rounded-lg">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{value}</div>
        {trend && (
          <p className={`text-xs mt-1 ${trendUp === true ? 'text-success' : trendUp === false ? 'text-destructive' : 'text-muted-foreground'}`}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
