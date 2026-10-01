export const JOB_EVENT_LOGGED = "job-event-logged";

export type LoggedHistoryEvent = {
  id: string;
  type: string;
  occurredAt: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  stage: string | null;
  resultingStatus: string | null;
  previousStatus: string | null;
  counterpartyName: string;
  summary: string;
};

export type EventWriteResult =
  | {
      ok: true;
      jobId: string | null;
      contactId: string | null;
      status: string | null;
      event: LoggedHistoryEvent | null;
      calendarFailed: boolean;
      existed: boolean;
    }
  | { ok: false; error: "required" | "link" | "date"; jobId?: string; contactId?: string };

export type DirectStatusResult =
  | { ok: true; jobId: string; status: string; event: LoggedHistoryEvent | null }
  | { ok: false; error: "required" };

export type EventFormCatalog = {
  jobs: { id: string; label: string }[];
  contacts: { id: string; label: string }[];
  notes: { id: string; label: string }[];
  cvs: { id: string; label: string; jobId: string }[];
  calendarLinked: boolean;
  occurredAt: string;
};
