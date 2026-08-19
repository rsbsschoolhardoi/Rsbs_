import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AttentionItem } from './types';
import { CreditCard, UserPlus, CalendarCheck, Calendar, HelpCircle, AlertTriangle } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const ICONS: Record<string, LucideIcon> = {
  fee: CreditCard,
  admission: UserPlus,
  attendance: CalendarCheck,
  event: Calendar,
  query: HelpCircle,
  alert: AlertTriangle,
};

interface NeedsAttentionProps {
  items: AttentionItem[];
}

export default function NeedsAttention({ items }: NeedsAttentionProps) {
  return (
    <Card className="rounded-2xl border border-border/60 bg-card shadow-card flex flex-col">
      <CardHeader className="p-5 pb-3 border-b">
        <CardTitle className="text-sm font-semibold text-foreground">Needs Attention</CardTitle>
      </CardHeader>
      <CardContent className="p-5 flex-1">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nothing requires attention right now.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = ICONS[item.type] || AlertTriangle;
              const content = (
                <div className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors group">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.subtitle}</p>
                    {item.action && (
                      <p className="text-xs font-medium text-accent mt-1.5">{item.action}</p>
                    )}
                  </div>
                </div>
              );
              return item.link ? (
                <Link key={item.id} to={item.link} className="block">
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
