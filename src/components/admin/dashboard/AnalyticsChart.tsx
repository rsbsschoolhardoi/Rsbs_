import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PeriodSelector, { AnalyticsPeriod } from './PeriodSelector';
import { useChartColors } from '@/hooks/useChartColors';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface DataPoint {
  label: string;
  value: number;
}

interface AnalyticsChartProps {
  title: string;
  subtitle?: string;
  data: DataPoint[];
  period: AnalyticsPeriod;
  onChangePeriod: (p: AnalyticsPeriod) => void;
  suffix?: string;
  metric?: string;
}

export default function AnalyticsChart({
  title,
  subtitle,
  data,
  period,
  onChangePeriod,
  suffix = '',
  metric,
}: AnalyticsChartProps) {
  const colors = useChartColors();

  const total = useMemo(() => {
    if (!metric) return null;
    const sum = data.reduce((acc, d) => acc + d.value, 0);
    return `${sum.toLocaleString('en-IN')}${suffix}`;
  }, [data, metric, suffix]);

  return (
    <Card className="rounded-2xl border border-border/60 bg-card shadow-card flex flex-col">
      <CardHeader className="p-5 pb-3 flex flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          {metric && <p className="text-lg font-semibold text-foreground mt-1.5">{metric}</p>}
          {total && !metric && <p className="text-lg font-semibold text-foreground mt-1.5">{total}</p>}
        </div>
        <PeriodSelector value={period} onChange={onChangePeriod} />
      </CardHeader>
      <CardContent className="p-5 pt-0 flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.muted} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: colors.secondary }}
              axisLine={{ stroke: colors.muted }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: colors.secondary }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '0.75rem',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                fontSize: '0.75rem',
              }}
              formatter={(value: number) => [`${value.toLocaleString('en-IN')}${suffix}`, title]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={colors.accent}
              strokeWidth={2.5}
              dot={{ r: 3, fill: colors.accent, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
