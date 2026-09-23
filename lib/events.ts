import type { EventType, JobStatus } from "@prisma/client";

export const JOB_STATUSES = [
  "interest",
  "contacted",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
  "on_hold",
] as const satisfies readonly JobStatus[];

export const EVENT_TYPES = ["interest", "outreach", "application", "meeting", "status_change"] as const satisfies readonly EventType[];

export const CHANNELS = ["email", "whatsapp", "linkedin_inmail", "phone", "video", "in_person", "other"] as const;

export const STAGES = ["hr", "manager", "technical", "final", "other"] as const;

export function defaultResultingStatus(type: EventType): JobStatus | null {
  switch (type) {
    case "interest":
      return "interest";
    case "outreach":
      return "contacted";
    case "application":
      return "applied";
    case "meeting":
      return "interviewing";
    case "status_change":
      return null;
  }
}
