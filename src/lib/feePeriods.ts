// Fiscal-year months order (April = index 0, March = index 11)
export const FISCAL_MONTHS = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March',
] as const;

export interface ParsedPeriod {
  period_type: 'monthly' | 'annual' | 'combined';
  period_value: string;
  period_months: string[];
}

function parseSessionYears(sessionYear: string): { startYear: number; endYear: number } {
  const [start, end] = sessionYear.split('-');
  const startYear = parseInt(start, 10);
  const endYear = end?.length === 2 ? startYear + 1 : parseInt(end, 10);
  if (Number.isNaN(startYear) || Number.isNaN(endYear)) {
    throw new Error('Invalid session year');
  }
  return { startYear, endYear };
}

function monthIndex(monthName: string): number {
  const idx = FISCAL_MONTHS.indexOf(monthName as any);
  if (idx === -1) throw new Error(`Unknown month: ${monthName}`);
  return idx;
}

export function paymentPeriodToMonths(period: string, sessionYear: string): ParsedPeriod {
  const normalized = period.trim();
  const { startYear, endYear } = parseSessionYears(sessionYear);

  if (normalized.toLowerCase() === 'full year') {
    return {
      period_type: 'annual',
      period_value: sessionYear,
      period_months: [`annual:${sessionYear}`],
    };
  }

  // Combined range: e.g. "April-June" or "January-March"
  if (normalized.includes('-') && !normalized.includes(' ')) {
    const [startMonth, endMonth] = normalized.split('-');
    const startIdx = monthIndex(startMonth);
    const endIdx = monthIndex(endMonth);
    const months: string[] = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const monthName = FISCAL_MONTHS[i];
      const year = ['January', 'February', 'March'].includes(monthName) ? endYear : startYear;
      months.push(`${year}-${String(i + 1).padStart(2, '0')}`);
    }
    return {
      period_type: 'combined',
      period_value: normalized,
      period_months: months,
    };
  }

  // Single month, optionally with a year: e.g. "April" or "April 2026"
  const parts = normalized.split(' ');
  const monthName = parts[0];
  const idx = monthIndex(monthName);
  const year = parts[1] ? parseInt(parts[1], 10) : ['January', 'February', 'March'].includes(monthName) ? endYear : startYear;
  return {
    period_type: 'monthly',
    period_value: normalized,
    period_months: [`${year}-${String(idx + 1).padStart(2, '0')}`],
  };
}

export function formatPeriodLabel(period: string, sessionYear: string): string {
  if (period.toLowerCase() === 'full year') return `Full Year (${sessionYear})`;
  return period;
}

export function isAnnualPeriod(period: string): boolean {
  return period.toLowerCase() === 'full year';
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatPeriodMonths(periodMonths?: string[] | null, periodType?: string | null): string {
  if (!periodMonths || periodMonths.length === 0) return '—';
  if (periodType === 'annual' || periodMonths[0]?.startsWith('annual:')) {
    return periodMonths[0]?.replace('annual:', 'Full Year ') ?? 'Full Year';
  }
  const labels = periodMonths.map((key) => {
    const [year, month] = key.split('-');
    const monthIdx = parseInt(month, 10) - 1;
    if (!year || Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return key;
    return `${MONTH_LABELS[monthIdx]} ${year}`;
  });
  return labels.join(', ');
}

export function periodTypeLabel(type?: string | null): string {
  if (!type) return 'Core';
  const map: Record<string, string> = {
    monthly: 'Monthly',
    annual: 'Annual',
    combined: 'Combined',
    extra: 'Extra',
  };
  return map[type] ?? 'Core';
}

/**
 * Build a YYYY-MM month key from a fiscal month name and the academic session.
 * January-March belong to the second calendar year of the session.
 */
export function monthKey(monthName: string, sessionYear: string): string {
  const { startYear, endYear } = parseSessionYears(sessionYear);
  const idx = FISCAL_MONTHS.indexOf(monthName as any);
  if (idx === -1) return monthName;
  const year = ['January', 'February', 'March'].includes(monthName) ? endYear : startYear;
  return `${year}-${String(idx + 1).padStart(2, '0')}`;
}

/**
 * Expand a period_months array into individual month keys. Annual entries such as
 * `annual:2026-2027` are expanded to all 12 months of that session.
 */
export function expandPeriodMonths(periodMonths: string[], sessionYear?: string): string[] {
  const expanded = new Set<string>();
  for (const m of periodMonths) {
    if (m.startsWith('annual:')) {
      const year = m.split(':')[1] ?? sessionYear;
      if (!year) continue;
      for (const monthName of FISCAL_MONTHS) {
        expanded.add(monthKey(monthName, year));
      }
    } else {
      expanded.add(m);
    }
  }
  return Array.from(expanded);
}

/**
 * Build the list of all valid period options that do NOT overlap any already-paid month.
 * Returns single months, continuous combined ranges, and Full Year only when completely unpaid.
 */
export function getAvailablePeriodOptions(sessionYear: string, paidMonths: string[]) {
  const paidSet = new Set(paidMonths);
  const allMonthKeys = FISCAL_MONTHS.map((m) => monthKey(m, sessionYear));
  const fullyPaid = allMonthKeys.every((m) => paidSet.has(m));

  if (fullyPaid) {
    return { options: [] as { label: string; period: string; period_type: 'monthly' | 'combined' | 'annual' }[], fullyPaid };
  }

  const options: { label: string; period: string; period_type: 'monthly' | 'combined' | 'annual' }[] = [];

  // Full Year only if nothing is paid yet
  if (paidSet.size === 0) {
    options.push({
      label: `Full Year ${sessionYear}`,
      period: 'Full Year',
      period_type: 'annual',
    });
  }

  // Generate all valid contiguous ranges of unpaid months
  for (let start = 0; start < FISCAL_MONTHS.length; start++) {
    if (paidSet.has(allMonthKeys[start])) continue;
    for (let end = start; end < FISCAL_MONTHS.length; end++) {
      if (paidSet.has(allMonthKeys[end])) break;
      const startName = FISCAL_MONTHS[start];
      const endName = FISCAL_MONTHS[end];
      const startYear = parseInt(allMonthKeys[start].split('-')[0], 10);
      const endYear = parseInt(allMonthKeys[end].split('-')[0], 10);
      const period = start === end ? startName : `${startName}-${endName}`;
      const label = start === end
        ? `${startName} ${startYear}`
        : `${startName}-${endName} ${startYear === endYear ? startYear : `${startYear}-${String(endYear).slice(-2)}`}`;
      options.push({
        label,
        period,
        period_type: start === end ? 'monthly' : 'combined',
      });
    }
  }

  return { options, fullyPaid };
}
