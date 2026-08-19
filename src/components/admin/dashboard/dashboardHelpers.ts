import {
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  subYears,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfWeek,
  eachMonthOfInterval,
  format,
  startOfWeek,
} from 'date-fns';
import { AnalyticsPeriod } from './PeriodSelector';

export function getRangeForPeriod(period: AnalyticsPeriod): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case '7d':
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case '1m':
      return { start: startOfDay(subMonths(now, 1)), end: endOfDay(now) };
    case '3m':
      return { start: startOfDay(subMonths(now, 3)), end: endOfDay(now) };
    case '1y':
      return { start: startOfDay(subYears(now, 1)), end: endOfDay(now) };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function buildDateLabels(period: AnalyticsPeriod, start: Date, end: Date): string[] {
  if (period === 'today') {
    return eachDayOfInterval({ start, end }).map((d) => format(d, 'h a'));
  }
  if (period === '7d') {
    return eachDayOfInterval({ start, end }).map((d) => format(d, 'EEE'));
  }
  if (period === '1m') {
    return eachDayOfInterval({ start, end }).map((d) => format(d, 'd MMM'));
  }
  if (period === '3m') {
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      return `${format(weekStart, 'd MMM')}${format(weekEnd, 'd MMM') !== format(weekStart, 'd MMM') ? ` - ${format(weekEnd, 'd MMM')}` : ''}`;
    });
  }
  return eachMonthOfInterval({ start, end }).map((d) => format(d, 'MMM yyyy'));
}

export function bucketDatesByLabel<T extends { date: string }>(
  items: T[],
  period: AnalyticsPeriod,
  start: Date,
  end: Date,
  aggregate: (bucket: T[]) => number
): { label: string; value: number }[] {
  const labels = buildDateLabels(period, start, end);
  const buckets = new Map<string, T[]>();

  items.forEach((item) => {
    const itemDate = new Date(item.date);
    let key = '';
    if (period === 'today') {
      key = format(itemDate, 'h a');
    } else if (period === '7d') {
      key = format(itemDate, 'EEE');
    } else if (period === '1m') {
      key = format(itemDate, 'd MMM');
    } else if (period === '3m') {
      const weekStart = startOfWeek(itemDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(itemDate, { weekStartsOn: 1 });
      key = `${format(weekStart, 'd MMM')}${format(weekEnd, 'd MMM') !== format(weekStart, 'd MMM') ? ` - ${format(weekEnd, 'd MMM')}` : ''}`;
    } else {
      key = format(itemDate, 'MMM yyyy');
    }
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(item);
  });

  return labels.map((label) => ({
    label,
    value: aggregate(buckets.get(label) || []),
  }));
}

export function bucketCreatedAtByLabel<T extends { created_at?: string }>(
  items: T[],
  period: AnalyticsPeriod,
  start: Date,
  end: Date
): { label: string; value: number }[] {
  return bucketDatesByLabel(
    items
      .filter((i) => i.created_at)
      .map((i) => ({ date: i.created_at!.slice(0, 10), raw: i })) as unknown as { date: string }[],
    period,
    start,
    end,
    (bucket) => bucket.length
  );
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
