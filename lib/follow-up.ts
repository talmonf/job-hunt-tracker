import type { EventType, JobStatus } from "@prisma/client";
import { eventScheduledStart } from "./events";

/** Statuses where a follow-up would only nag. Offer, on hold, and parked still need a check-in. */
const FINISHED_STATUSES = new Set<JobStatus>(["rejected", "not_applicable", "withdrawn"]);

const UPDATING_TYPES = new Set<EventType>(["outreach", "application", "meeting", "status_change"]);

export type FollowUpEvent = {
  type: string;
  occurredAt: Date;
  startsAt: Date | null;
};

/**
 * A follow-up date is obsolete when the role is finished, or when an outreach,
 * application, meeting, or status change is already at or after that date.
 * Interest events do not count: they start the quiet period the date is for.
 * Meetings are compared at startsAt, or occurredAt when startsAt is empty.
 */
export function followUpSuperseded(input: {
  followUpAt: Date | null;
  status: string;
  events: readonly FollowUpEvent[];
}): boolean {
  if (!input.followUpAt) return false;
  if (FINISHED_STATUSES.has(input.status as JobStatus)) return true;
  const due = input.followUpAt.getTime();
  return input.events.some((event) => {
    if (!UPDATING_TYPES.has(event.type as EventType)) return false;
    const at = event.type === "meeting" ? eventScheduledStart(event) : event.occurredAt;
    return at !== null && at.getTime() >= due;
  });
}
