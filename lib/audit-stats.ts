const DAY_CAP = 366;

export type Distribution = {
  total: number;
  withAny: number;
  max: number;
  average: number;
  median: number;
};

export function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/** Per-account counts. Accounts with zero are included in the average and median. */
export function distribution(nonzero: number[], userCount: number): Distribution {
  const counts = nonzero.filter((value) => value > 0);
  const total = counts.reduce((sum, value) => sum + value, 0);
  const withAny = counts.length;
  const accounts = Math.max(userCount, withAny);
  const zeros = Math.max(0, accounts - withAny);
  const all = counts.concat(Array.from({ length: zeros }, () => 0));
  return {
    total,
    withAny,
    max: counts.length === 0 ? 0 : Math.max(...counts),
    average: accounts === 0 ? 0 : total / accounts,
    median: medianOf(all),
  };
}

export function isoDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function addIsoDays(iso: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${utc.getUTCFullYear()}-${month}-${day}`;
}

export function eachIsoDay(start: string, end: string): string[] {
  if (!isoDate(start) || !isoDate(end) || start > end) return [];
  const days: string[] = [];
  let cursor = start;
  while (cursor <= end && days.length < 4000) {
    days.push(cursor);
    cursor = addIsoDays(cursor, 1);
  }
  return days;
}

export type DayWindow = { from: string; to: string; truncated: boolean };

/** Daily table window. With no dates, the last 30 days ending today. */
export function dailyWindow(from: string, to: string, today: string): DayWindow {
  const start = isoDate(from);
  const end = isoDate(to);
  const endDay = end ?? today;
  let rangeStart = start ?? addIsoDays(endDay, -29);
  let rangeEnd = start && !end ? (today < start ? start : today) : endDay;
  if (rangeStart > rangeEnd) {
    const swap = rangeStart;
    rangeStart = rangeEnd;
    rangeEnd = swap;
  }
  if (addIsoDays(rangeStart, DAY_CAP - 1) < rangeEnd) {
    return { from: addIsoDays(rangeEnd, -(DAY_CAP - 1)), to: rangeEnd, truncated: true };
  }
  return { from: rangeStart, to: rangeEnd, truncated: false };
}

export function displayIsoDay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}
