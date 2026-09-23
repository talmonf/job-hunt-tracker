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

export function parseDateTime(value: FormDataEntryValue | null, timeZone: string): Date | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!text.includes("T")) return wallClockToUtc(`${text}T00:00`, timeZone);
  return wallClockToUtc(text, timeZone);
}
