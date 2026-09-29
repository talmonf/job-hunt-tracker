import type { NoteType } from "@prisma/client";

export const NOTE_TYPES = [
  "interview_prep",
  "interview_debrief",
  "company_research",
  "follow_up",
  "thank_you",
  "other",
] as const satisfies readonly NoteType[];
