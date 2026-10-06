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
  "work_experience",
  "other",
] as const satisfies readonly NoteType[];

export const EMPLOYMENT_NOTE_TYPES = ["work_experience"] as const satisfies readonly NoteType[];

const listed = new Set<string>();
export const NOTE_TYPES: NoteType[] = [...JOB_NOTE_TYPES, ...CONTACT_NOTE_TYPES, ...GENERAL_NOTE_TYPES, ...EMPLOYMENT_NOTE_TYPES].filter((type) => {
  if (listed.has(type)) return false;
  listed.add(type);
  return true;
});

export type NoteSubjectKind = "job" | "contact" | "company" | "employment" | "general";

export function subjectKind(value: string): NoteSubjectKind {
  if (value.startsWith("job:")) return "job";
  if (value.startsWith("contact:")) return "contact";
  if (value.startsWith("company:")) return "company";
  if (value.startsWith("employment:")) return "employment";
  return "general";
}

export function subjectValue(note: {
  jobId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  employmentId?: string | null;
}): string {
  if (note.jobId) return `job:${note.jobId}`;
  if (note.contactId) return `contact:${note.contactId}`;
  if (note.companyId) return `company:${note.companyId}`;
  if (note.employmentId) return `employment:${note.employmentId}`;
  return "";
}

export function noteTypesFor(kind: NoteSubjectKind): readonly NoteType[] {
  if (kind === "job" || kind === "company") return JOB_NOTE_TYPES;
  if (kind === "contact") return CONTACT_NOTE_TYPES;
  if (kind === "employment") return EMPLOYMENT_NOTE_TYPES;
  return GENERAL_NOTE_TYPES;
}

export function employmentNoteLabel(employment: { title: string; company: string }): string {
  const title = employment.title.trim();
  const company = employment.company.trim();
  if (title && company) return `${title} — ${company}`;
  return title || company;
}

export function experienceNoteBodies(bullets: { textEn: string; textHe: string }[]): { bodyEn: string; bodyHe: string } {
  return {
    bodyEn: bullets.map((bullet) => bullet.textEn.trim()).filter(Boolean).join("\n"),
    bodyHe: bullets.map((bullet) => bullet.textHe.trim()).filter(Boolean).join("\n"),
  };
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
