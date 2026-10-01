import type { Channel, EventType, JobStatus, MeetingStage, User } from "@prisma/client";
import { prisma } from "./prisma";
import { parseDateTime, requiredText } from "./forms";
import { dateTimeInputValue } from "./dates";
import { CHANNELS, defaultResultingStatus, EVENT_TYPES, JOB_STATUSES, STAGES } from "./events";
import { recomputeJobStatus } from "./job-status";
import { t } from "./i18n";
import { dash } from "./mask";
import { syncMeetingToCalendar } from "./calendar";
import type { DirectStatusResult, EventFormCatalog, EventWriteResult, LoggedHistoryEvent } from "./job-activity";

type TimedRow = {
  id: string;
  type: string;
  occurredAt: Date;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  stage: string | null;
  resultingStatus: string | null;
  previousStatus: string | null;
  counterpartyName: string;
  summary: string;
  jobId: string | null;
};

function toHistory(event: TimedRow): LoggedHistoryEvent {
  return {
    id: event.id,
    type: event.type,
    occurredAt: event.occurredAt.toISOString(),
    startsAt: event.startsAt ? event.startsAt.toISOString() : null,
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    createdAt: event.createdAt.toISOString(),
    stage: event.stage,
    resultingStatus: event.resultingStatus,
    previousStatus: event.previousStatus,
    counterpartyName: event.counterpartyName,
    summary: event.summary,
  };
}

async function ownedJob(userId: string, jobId: string) {
  if (!jobId) return null;
  return prisma.job.findFirst({ where: { id: jobId, userId } });
}

function optionalEnum<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[]): T | null {
  const text = requiredText(value);
  if (!(allowed as readonly string[]).includes(text)) return null;
  return text as T;
}

async function readStatus(jobId: string) {
  const row = await prisma.job.findFirst({ where: { id: jobId }, select: { status: true } });
  return row?.status ?? null;
}

export async function eventFormCatalog(user: Pick<User, "id" | "timezone" | "calendarRefreshToken">, hide: boolean): Promise<EventFormCatalog> {
  const [jobs, contacts, notes, cvs] = await Promise.all([
    prisma.job.findMany({ where: { userId: user.id }, orderBy: { companyName: "asc" } }),
    prisma.contact.findMany({ where: { userId: user.id }, orderBy: { fullName: "asc" } }),
    prisma.note.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.jobCv.findMany({
      where: { job: { userId: user.id } },
      include: { job: true },
      orderBy: { uploadedAt: "desc" },
    }),
  ]);
  return {
    jobs: jobs.map((job) => ({
      id: job.id,
      label: dash(`${job.companyName}${job.title ? ` — ${job.title}` : ""}`, hide),
    })),
    contacts: contacts.map((item) => ({ id: item.id, label: dash(item.fullName, hide) })),
    notes: notes.map((item) => ({ id: item.id, label: dash(item.title, hide) })),
    cvs: cvs.map((cv) => ({
      id: cv.id,
      jobId: cv.jobId,
      label: dash(`${cv.job.companyName} — ${cv.filename}`, hide),
    })),
    calendarLinked: Boolean(user.calendarRefreshToken),
    occurredAt: dateTimeInputValue(new Date(), user.timezone),
  };
}

export async function applyDirectStatusChange(user: Pick<User, "id" | "uiLanguage">, formData: FormData): Promise<DirectStatusResult> {
  const job = await ownedJob(user.id, requiredText(formData.get("jobId")));
  const status = requiredText(formData.get("status")) as JobStatus;
  if (!job || !JOB_STATUSES.includes(status)) return { ok: false, error: "required" };
  if (job.status === status) return { ok: true, jobId: job.id, status: job.status, event: null };
  const created = await prisma.event.create({
    data: {
      userId: user.id,
      jobId: job.id,
      type: "status_change",
      occurredAt: new Date(),
      previousStatus: job.status,
      resultingStatus: status,
      summary: t(user.uiLanguage, "systemStatusChange"),
    },
  });
  await recomputeJobStatus(job.id);
  return {
    ok: true,
    jobId: job.id,
    status: (await readStatus(job.id)) ?? status,
    event: toHistory(created),
  };
}

export async function persistEvent(user: User, formData: FormData): Promise<EventWriteResult> {
  const type = requiredText(formData.get("type")) as EventType;
  if (!EVENT_TYPES.includes(type)) return { ok: false, error: "required" };
  const jobId = requiredText(formData.get("jobId"));
  const contactId = requiredText(formData.get("contactId"));
  const job = jobId ? await ownedJob(user.id, jobId) : null;
  const contact = contactId ? await prisma.contact.findFirst({ where: { id: contactId, userId: user.id } }) : null;
  if (!job && !contact) return { ok: false, error: "link" };
  const occurredAt = parseDateTime(formData.get("occurredAt"), user.timezone);
  if (!occurredAt) return { ok: false, error: "date", jobId: job?.id, contactId: contact?.id };
  const startsAt = type === "meeting" ? parseDateTime(formData.get("startsAt"), user.timezone) : null;
  const endsAt = type === "meeting" ? parseDateTime(formData.get("endsAt"), user.timezone) : null;
  if (type === "meeting" && !startsAt) return { ok: false, error: "date", jobId: job?.id, contactId: contact?.id };
  if (startsAt && endsAt && endsAt.getTime() < startsAt.getTime()) {
    return { ok: false, error: "date", jobId: job?.id, contactId: contact?.id };
  }
  const channel = optionalEnum(formData.get("channel"), CHANNELS) as Channel | null;
  const stage = optionalEnum(formData.get("stage"), STAGES) as MeetingStage | null;
  let resultingStatus = defaultResultingStatus(type);
  if (type === "status_change") {
    const picked = requiredText(formData.get("resultingStatus")) as JobStatus;
    if (!JOB_STATUSES.includes(picked)) return { ok: false, error: "required", jobId: job?.id, contactId: contact?.id };
    resultingStatus = picked;
  }
  if (type === "outreach" && !channel) return { ok: false, error: "required", jobId: job?.id, contactId: contact?.id };
  if (type === "meeting" && !stage) return { ok: false, error: "required", jobId: job?.id, contactId: contact?.id };
  const noteId = requiredText(formData.get("noteId"));
  const note = noteId ? await prisma.note.findFirst({ where: { id: noteId, userId: user.id } }) : null;
  const cvId = requiredText(formData.get("cvId"));
  const cv = cvId && job ? await prisma.jobCv.findFirst({ where: { id: cvId, jobId: job.id } }) : null;
  const eventId = requiredText(formData.get("eventId"));
  const existing = eventId ? await prisma.event.findFirst({ where: { id: eventId, userId: user.id } }) : null;
  const data = {
    type,
    occurredAt,
    startsAt,
    endsAt,
    jobId: job?.id ?? null,
    contactId: contact?.id ?? null,
    channel: type === "outreach" || type === "meeting" ? channel : null,
    counterpartyName: requiredText(formData.get("counterpartyName")),
    stage: type === "meeting" ? stage : null,
    resultingStatus,
    summary: String(formData.get("summary") ?? ""),
    noteId: note?.id ?? null,
    cvId: cv?.id ?? null,
    tailoredCv: type === "application" ? formData.get("tailoredCv") === "1" : null,
  };
  const saved = existing
    ? await prisma.event.update({ where: { id: existing.id }, data })
    : await prisma.event.create({
        data: {
          userId: user.id,
          ...data,
          previousStatus: type === "status_change" ? (job?.status ?? null) : null,
        },
      });
  let calendarFailed = false;
  if (type === "meeting") {
    const sync = await syncMeetingToCalendar({
      user,
      event: { ...saved, googleCalendarEventId: existing?.googleCalendarEventId ?? null },
      job,
      enabled: formData.get("addToCalendar") === "1",
    });
    if (sync === "failed") calendarFailed = true;
    else if (sync) {
      await prisma.event.update({
        where: { id: saved.id },
        data: { googleCalendarEventId: sync.id, googleCalendarHtmlLink: sync.htmlLink },
      });
    } else if (existing?.googleCalendarEventId) {
      await prisma.event.update({
        where: { id: saved.id },
        data: { googleCalendarEventId: null, googleCalendarHtmlLink: null },
      });
    }
  }
  if (job) await recomputeJobStatus(job.id);
  if (existing?.jobId && existing.jobId !== job?.id) await recomputeJobStatus(existing.jobId);
  const focusId = requiredText(formData.get("focusJobId"));
  const statusId = focusId || job?.id || "";
  const statusOwner = statusId ? await ownedJob(user.id, statusId) : null;
  const status = statusOwner ? await readStatus(statusOwner.id) : null;
  const event = saved.jobId && (!focusId || saved.jobId === focusId) ? toHistory(saved) : null;
  return {
    ok: true,
    jobId: job?.id ?? null,
    contactId: contact?.id ?? null,
    status,
    event,
    calendarFailed,
    existed: Boolean(existing),
  };
}
