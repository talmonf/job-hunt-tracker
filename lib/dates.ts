export function excelSerialToUtcDate(serial: number): Date {
  const whole = Math.floor(serial);
  const fraction = serial - whole;
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + whole * 86400000 + Math.round(fraction * 86400000));
}

export function formatDate(date: Date, timeZone: string): string {
  const parts = partsInZone(date, timeZone);
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year}`;
}

export function formatMonthYear(date: Date, timeZone: string): string {
  const parts = partsInZone(date, timeZone);
  return `${pad(parts.month)}/${parts.year}`;
}

export function formatDateTime(date: Date, timeZone: string): string {
  const parts = partsInZone(date, timeZone);
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatTime(date: Date, timeZone: string): string {
  const parts = partsInZone(date, timeZone);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

const weekdayEn = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"] as const;
const weekdayHe = ["יום א׳", "יום ב׳", "יום ג׳", "יום ד׳", "יום ה׳", "יום ו׳", "שבת"] as const;
const monthEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const monthHe = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"] as const;

function weekdayIndex(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? 0;
}

export function formatScheduledDay(date: Date, timeZone: string, lang: "en" | "he" = "en"): string {
  const parts = partsInZone(date, timeZone);
  const weekday = (lang === "he" ? weekdayHe : weekdayEn)[weekdayIndex(date, timeZone)];
  return `${weekday} ${parts.day}/${parts.month}`;
}

function formatWeekdayDayMonth(date: Date, timeZone: string, lang: "en" | "he"): string {
  const parts = partsInZone(date, timeZone);
  return `${formatScheduledDay(date, timeZone, lang)} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatScheduledRange(start: Date, end: Date | null, timeZone: string, lang: "en" | "he" = "en"): string {
  const from = formatWeekdayDayMonth(start, timeZone, lang);
  if (!end) return from;
  const startParts = partsInZone(start, timeZone);
  const endParts = partsInZone(end, timeZone);
  const sameDay =
    startParts.year === endParts.year && startParts.month === endParts.month && startParts.day === endParts.day;
  if (sameDay) return `${from} - ${pad(endParts.hour)}:${pad(endParts.minute)}`;
  return `${from} - ${formatWeekdayDayMonth(end, timeZone, lang)}`;
}

export function wallClockToUtc(value: string, timeZone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4] === undefined ? 0 : Number(match[4]);
  const minute = match[5] === undefined ? 0 : Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = zoneOffsetMs(utcGuess, timeZone);
  const instant = new Date(utcGuess.getTime() - offset);
  const check = partsInZone(instant, timeZone);
  if (check.year !== year || check.month !== month || check.day !== day || check.hour !== hour || check.minute !== minute) {
    const adjusted = new Date(instant.getTime() - (zoneOffsetMs(instant, timeZone) - offset));
    return adjusted;
  }
  return instant;
}

export function dateInputValue(date: Date, timeZone: string): string {
  const parts = partsInZone(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function dateTimeInputValue(date: Date, timeZone: string): string {
  const parts = partsInZone(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

export function localDateString(date: Date, timeZone: string): string {
  const parts = partsInZone(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function localHour(date: Date, timeZone: string): number {
  return partsInZone(date, timeZone).hour;
}

export function addLocalDays(date: Date, days: number, timeZone: string): Date {
  const parts = partsInZone(date, timeZone);
  const noon = wallClockToUtc(`${parts.year}-${pad(parts.month)}-${pad(parts.day)}T12:00`, timeZone);
  if (!noon) return addDays(date, days);
  const shifted = partsInZone(new Date(noon.getTime() + days * 86400000), timeZone);
  return (
    wallClockToUtc(
      `${shifted.year}-${pad(shifted.month)}-${pad(shifted.day)}T${pad(parts.hour)}:${pad(parts.minute)}`,
      timeZone,
    ) ?? addDays(date, days)
  );
}

export function startOfSundayWeek(now: Date, timeZone: string): Date {
  const parts = partsInZone(now, timeZone);
  const noon = wallClockToUtc(`${parts.year}-${pad(parts.month)}-${pad(parts.day)}T12:00`, timeZone);
  if (!noon) return now;
  const startNoon = new Date(noon.getTime() - weekdayIndex(noon, timeZone) * 86400000);
  const startParts = partsInZone(startNoon, timeZone);
  return wallClockToUtc(`${startParts.year}-${pad(startParts.month)}-${pad(startParts.day)}T00:00`, timeZone) ?? startNoon;
}

export function formatWeekRange(weekStart: Date, timeZone: string, lang: "en" | "he" = "en"): string {
  const weekEnd = addLocalDays(weekStart, 6, timeZone);
  return `${formatWeekdayDayMonthShort(weekStart, timeZone, lang)} - ${formatWeekdayDayMonthShort(weekEnd, timeZone, lang)}`;
}

function formatWeekdayDayMonthShort(date: Date, timeZone: string, lang: "en" | "he"): string {
  const parts = partsInZone(date, timeZone);
  const weekday = (lang === "he" ? weekdayHe : weekdayEn)[weekdayIndex(date, timeZone)];
  const month = (lang === "he" ? monthHe : monthEn)[parts.month - 1];
  return `${weekday} ${parts.day} ${month}`;
}

function partsInZone(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) map[part.type] = part.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = partsInZone(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
