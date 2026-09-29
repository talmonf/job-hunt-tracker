import type { EventType, JobStatus } from "@prisma/client";
import { dateTimeInputValue } from "./dates";

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

type TimedEvent = {
  type: string;
  occurredAt: Date;
  startsAt: Date | null;
  createdAt: Date;
};

export function eventLoggedAt(event: TimedEvent): Date {
  if (event.type === "meeting" && !event.startsAt) return event.createdAt;
  return event.occurredAt;
}

export function eventScheduledStart(event: Pick<TimedEvent, "type" | "occurredAt" | "startsAt">): Date | null {
  if (event.type !== "meeting") return null;
  return event.startsAt ?? event.occurredAt;
}

export function eventFormValues(
  event: TimedEvent & {
    id: string;
    endsAt: Date | null;
    channel: string | null;
    stage: string | null;
    counterpartyName: string;
    summary: string;
    noteId: string | null;
    cvId: string | null;
    tailoredCv: boolean | null;
    resultingStatus: string | null;
    googleCalendarEventId: string | null;
  },
  timeZone: string,
) {
  const scheduled = eventScheduledStart(event);
  return {
    id: event.id,
    type: event.type,
    occurredAt: dateTimeInputValue(eventLoggedAt(event), timeZone),
    startsAt: scheduled ? dateTimeInputValue(scheduled, timeZone) : "",
    endsAt: event.endsAt ? dateTimeInputValue(event.endsAt, timeZone) : "",
    channel: event.channel ?? "",
    stage: event.stage ?? "",
    counterpartyName: event.counterpartyName,
    summary: event.summary,
    noteId: event.noteId ?? "",
    cvId: event.cvId ?? "",
    tailoredCv: Boolean(event.tailoredCv),
    resultingStatus: event.resultingStatus ?? "",
    onCalendar: Boolean(event.googleCalendarEventId),
  };
}

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
