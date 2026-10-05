import { wallClockToUtc } from "./dates";

export function requiredText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

export function optionalInt(value: FormDataEntryValue | null, max: number): number | null | "invalid" {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > max) return "invalid";
  return parsed;
}

export function optionalFloat(value: FormDataEntryValue | null): number | null | "invalid" {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) return "invalid";
  return parsed;
}

export function parseDateOnly(value: FormDataEntryValue | null, timeZone: string): Date | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return wallClockToUtc(text, timeZone);
}

export function parseCareerDate(value: FormDataEntryValue | string | null, timeZone: string): Date | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const monthYear = /^(\d{2})\/(\d{4})$/.exec(text);
  if (monthYear) return wallClockToUtc(`${monthYear[2]}-${monthYear[1]}-01`, timeZone);
  const year = /^(\d{4})$/.exec(text);
  if (year) return wallClockToUtc(`${year[1]}-01-01`, timeZone);
  return parseDateOnly(text, timeZone);
}

export function parseDateTime(value: FormDataEntryValue | null, timeZone: string): Date | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!text.includes("T")) return wallClockToUtc(`${text}T00:00`, timeZone);
  return wallClockToUtc(text, timeZone);
}
