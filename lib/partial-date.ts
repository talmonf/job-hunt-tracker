export type PartialDate =
  | { precision: "year"; year: number }
  | { precision: "month"; year: number; month: number }
  | { precision: "day"; year: number; month: number; day: number };

const YEAR_MIN = 1000;
const YEAR_MAX = 2200;

export function parsePartialDate(raw: string): PartialDate | null {
  const text = raw.trim();
  if (!text) return null;
  const day = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (day) {
    const parsed = { year: Number(day[3]), month: Number(day[2]), day: Number(day[1]) };
    if (!validDay(parsed.year, parsed.month, parsed.day)) return null;
    return { precision: "day", ...parsed };
  }
  const month = /^(\d{1,2})\/(\d{4})$/.exec(text);
  if (month) {
    const parsed = { year: Number(month[2]), month: Number(month[1]) };
    if (!validYear(parsed.year) || parsed.month < 1 || parsed.month > 12) return null;
    return { precision: "month", ...parsed };
  }
  const year = /^(\d{4})$/.exec(text);
  if (year) {
    const parsed = Number(year[1]);
    if (!validYear(parsed)) return null;
    return { precision: "year", year: parsed };
  }
  return null;
}

export function formatPartialDate(date: PartialDate): string {
  const year = String(date.year);
  if (date.precision === "year") return year;
  const month = pad(date.month);
  if (date.precision === "month") return `${month}/${year}`;
  return `${pad(date.day)}/${month}/${year}`;
}

export function canonicalPartialDate(raw: string): string | null {
  const parsed = parsePartialDate(raw);
  return parsed ? formatPartialDate(parsed) : null;
}

function validYear(year: number) {
  return year >= YEAR_MIN && year <= YEAR_MAX;
}

function validDay(year: number, month: number, day: number) {
  if (!validYear(year) || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
