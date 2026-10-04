import type { NoteType } from "@prisma/client";

export const JOB_NOTE_TYPES = [
  "interview_prep",
  "interview_debrief",
  "company_research",
  "follow_up",
  "thank_you",
  "other",
] as const satisfies readonly NoteType[];

export const CONTACT_NOTE_TYPES = [
  "meeting_prep",
  "meeting_summary",
  "coffee_chat",
  "intro_request",
  "referral",
  "relationship",
  "follow_up",
  "thank_you",
  "other",
] as const satisfies readonly NoteType[];

export const GENERAL_NOTE_TYPES = [
  "reminder",
  "idea",
  "general",
  "other",
] as const satisfies readonly NoteType[];

const listed = new Set<string>();
export const NOTE_TYPES: NoteType[] = [...JOB_NOTE_TYPES, ...CONTACT_NOTE_TYPES, ...GENERAL_NOTE_TYPES].filter((type) => {
  if (listed.has(type)) return false;
  listed.add(type);
  return true;
});

export type NoteSubjectKind = "job" | "contact" | "company" | "general";

export function subjectKind(value: string): NoteSubjectKind {
  if (value.startsWith("job:")) return "job";
  if (value.startsWith("contact:")) return "contact";
  if (value.startsWith("company:")) return "company";
  return "general";
}

export function subjectValue(note: { jobId?: string | null; contactId?: string | null; companyId?: string | null }): string {
  if (note.jobId) return `job:${note.jobId}`;
  if (note.contactId) return `contact:${note.contactId}`;
  if (note.companyId) return `company:${note.companyId}`;
  return "";
}

export function noteTypesFor(kind: NoteSubjectKind): readonly NoteType[] {
  if (kind === "job" || kind === "company") return JOB_NOTE_TYPES;
  if (kind === "contact") return CONTACT_NOTE_TYPES;
  return GENERAL_NOTE_TYPES;
}

export function jobNoteLabel(job: { companyName: string; title: string }): string {
  return `${job.companyName}${job.title ? ` — ${job.title}` : ""}`;
}

export function notePreview(
  note: { title: string; additionalInfo: string; bodyEn: string; bodyHe: string },
  lang: "en" | "he",
): string {
  const primary = lang === "he" ? note.bodyHe : note.bodyEn;
  const secondary = lang === "he" ? note.bodyEn : note.bodyHe;
  return [primary, secondary, note.additionalInfo, note.title].map((part) => part.trim()).find(Boolean) ?? "";
}
