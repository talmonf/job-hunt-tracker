import type { CellValue } from "exceljs";
import type { Channel, JobStatus, MeetingStage } from "@prisma/client";
import { excelSerialToUtcDate, wallClockToUtc } from "./dates";

/** Clock used when a MentMe cell has a calendar date and no time. */
export const IMPORTED_DATE_TIME = "09:00";

const TERMINAL_JOB_STATUSES = new Set<JobStatus>(["rejected", "offer", "withdrawn", "not_applicable"]);

export function isTerminalJobStatus(status: string | null | undefined): status is JobStatus {
  return !!status && TERMINAL_JOB_STATUSES.has(status as JobStatus);
}

export function parseImportedDate(value: CellValue, timeZone: string): Date | null {
  const parts = dateParts(unwrapCell(value));
  if (!parts) return null;
  return wallClockToUtc(`${parts.iso}T${parts.time ?? IMPORTED_DATE_TIME}`, timeZone);
}

export function applicationOutcome(response: string): JobStatus | null {
  const text = normalize(response).toLowerCase();
  if (!text) return null;
  if (/לא עברתי|דחי|דחו|rejected|rejection/.test(text)) return "rejected";
  if (/משכתי את המועמדות|משכתי מועמדות|withdrawn/.test(text)) return "withdrawn";
  if (/לא רלוונטי|לא מתאים|not applicable/.test(text)) return "not_applicable";
  if (/לא קיבלתי הצעה/.test(text)) return null;
  if (/קיבלתי הצעה|הצעת עבודה|\boffer\b/.test(text)) return "offer";
  if (/זומנתי|עברתי לראיון|יש ראיון|\binterview\b|ראיון/.test(text)) return "interviewing";
  return null;
}

export function applicationSummary(parts: {
  how: string;
  response: string;
  gotUpdate: string;
  notes: string;
  reply: string;
}): string {
  return [
    parts.how && `איך הגשתי: ${parts.how}`,
    parts.response && `תשובה: ${parts.response}`,
    parts.gotUpdate && `קיבלתי עדכון: ${parts.gotUpdate}`,
    parts.notes,
    parts.reply && `התשובה שהתקבלה: ${parts.reply}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function followUpNoteFromReminder(reminder: string): string {
  const text = reminder.trim();
  return text ? `שלחתי מייל תזכורת: ${text}` : "";
}

export function splitContactDetails(raw: string): {
  email: string;
  mobile: string;
  linkedinUrl: string;
  contactDetails: string;
} {
  const contactDetails = raw.trim();
  const email = contactDetails.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const linkedin = contactDetails.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0] ?? "";
  const mobile =
    contactDetails.match(/(?:\+?972[-\s]?|0)(?:5\d[-\s]?\d{3}[-\s]?\d{4}|[2-489][-\s]?\d{3}[-\s]?\d{4})/)?.[0] ?? "";
  return {
    email,
    mobile: mobile.replace(/\s+/g, " ").trim(),
    linkedinUrl: linkedin ? normalizeLinkedIn(linkedin) : "",
    contactDetails,
  };
}

export function interviewNoteBody(parts: {
  kind: string;
  summary: string;
  positives: string;
  negatives: string;
  lessons: string;
  thankYou: string;
  reminder: string;
  gotUpdate: string;
  feedback: string;
  askedFeedback: string;
  thanked: string;
  notes: string;
}): string {
  return [
    line("סוג הריאיון", parts.kind),
    line("סיכום", parts.summary),
    line("נקודות חיוביות", parts.positives),
    line("פחות טוב", parts.negatives),
    line("לקחים", parts.lessons),
    line("הודעת תודה", parts.thankYou),
    line("מייל תזכורת", parts.reminder),
    line("קיבלתי עדכון", parts.gotUpdate),
    line("קיבלתי פידבק", parts.feedback),
    line("ביקשתי פידבק", parts.askedFeedback),
    line("הודיתי על ההזדמנות", parts.thanked),
    line("הערות", parts.notes),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function interviewStage(kind: string): MeetingStage {
  const text = kind.toLowerCase();
  if (text.includes("סופי") || text.includes("final")) return "final";
  if (text.includes("מנהל") || text.includes("manager")) return "manager";
  if (text.includes("טכני") || text.includes("technical") || text.includes("מקצוע")) return "technical";
  if (
    text.includes("hr") ||
    text.includes("אישיות") ||
    text.includes("משאבי אנוש") ||
    text.includes("גיוס") ||
    text.includes("היכרות") ||
    text.includes("מסנן") ||
    text.includes("ראשוני")
  ) {
    return "hr";
  }
  return "other";
}

export function channelFromText(value: string): Channel | null {
  const text = value.toLowerCase();
  if (!text.trim()) return null;
  if (text.includes("whatsapp") || text.includes("וואטסאפ") || text.includes("ווטסאפ")) return "whatsapp";
  if (text.includes("inmail")) return "linkedin_inmail";
  if (text.includes("zoom") || text.includes("זום") || text.includes("וידאו") || text.includes("video") || text.includes("teams") || text.includes("טימס")) {
    return "video";
  }
  if (text.includes("פרונטל") || text.includes("פנים אל פנים") || text.includes("in person") || text.includes("במשרד")) return "in_person";
  if (text.includes("mail") || text.includes("מייל") || text.includes("אימייל") || text.includes("דוא")) return "email";
  if (text.includes("phone") || text.includes("טלפון") || text.includes("טלפוני") || text.includes("נייד")) return "phone";
  if (text.includes("linkedin") || text.includes("לינקדאין") || text.includes("לינקדין")) return "linkedin_inmail";
  return null;
}

function line(label: string, value: string): string {
  const text = value.trim();
  return text ? `${label}: ${text}` : "";
}

function normalizeLinkedIn(value: string): string {
  const trimmed = value.trim().replace(/[.,;:)]+$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function unwrapCell(value: CellValue): CellValue {
  if (value && typeof value === "object" && "result" in value) return unwrapCell(value.result as CellValue);
  return value;
}

function dateParts(raw: CellValue): { iso: string; time: string | null } | null {
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    return fromUtcDate(raw);
  }
  if (typeof raw === "number" && raw > 20000 && raw < 80000) return fromUtcDate(excelSerialToUtcDate(raw));
  if (typeof raw === "string") return fromDateText(raw.trim());
  return null;
}

function fromUtcDate(date: Date): { iso: string; time: string | null } {
  const iso = date.toISOString().slice(0, 10);
  const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0;
  if (!hasTime) return { iso, time: null };
  return { iso, time: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}` };
}

function fromDateText(text: string): { iso: string; time: string | null } | null {
  const dmy = /^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(text);
  if (dmy) {
    return {
      iso: `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`,
      time: dmy[4] !== undefined ? `${dmy[4].padStart(2, "0")}:${dmy[5]}` : null,
    };
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(text);
  if (!iso) return null;
  return {
    iso: `${iso[1]}-${iso[2]}-${iso[3]}`,
    time: iso[4] !== undefined ? `${iso[4]}:${iso[5]}` : null,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function normalize(value: string): string {
  return value.replace(/[״"]/g, '"').replace(/\s+/g, " ").trim();
}

export function hoursToMinutes(value: number, numFmt = ""): number {
  const excelTime = /h/i.test(numFmt) && value > 0 && value < 1;
  if (excelTime) return Math.round(value * 24 * 60);
  return Math.round(value * 60);
}
